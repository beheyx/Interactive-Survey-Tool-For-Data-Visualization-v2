require('dotenv').config()

// set up express
const express = require('express')
const compression = require('compression')
const app = express()
const path = require('path')
const fs = require('fs')

function getResvg() {
  // Lazy load so normal visualization pages never break
  const { Resvg } = require("@resvg/resvg-js");
  return Resvg;
}


// Enable gzip compression for all responses
app.use(compression())

// Increase JSON body parser limit to 50MB to handle large SVG files
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, "public")))

// setup axios API interface
const axios = require('axios');
const api = axios.create({
    baseURL: process.env.VISUAL_API_URL,
    maxContentLength: 50 * 1024 * 1024, // 50MB
    maxBodyLength: 50 * 1024 * 1024, // 50MB
    timeout: 120000 // 2 minutes
})
const mainApi = axios.create({
    baseURL: process.env.MAIN_API_URL,
    maxContentLength: 50 * 1024 * 1024, // 50MB
    maxBodyLength: 50 * 1024 * 1024, // 50MB
    timeout: 120000 // 2 minutes
})

// express-handlebars setup
// this dynamically renders pages
app.set('views', path.join(__dirname, 'views'));
const exphbs = require('express-handlebars');
app.engine("handlebars", exphbs.engine({
    defaultLayout: false
}))
app.set("view engine", "handlebars")

//file upload
const multer = require("multer")
const crypto = require("node:crypto")
const { stat } = require('node:fs')
const imageTypes = {
    "image/jpeg": "jpg",
    "image/png": "png"
}
const storage = multer.diskStorage({
        destination: (req, file, callback) => {
            callback(null, `${__dirname}/uploads`)
        },
        filename: (req, file, callback) => {
            callback(null, file.originalname)
        }
    })
    // fileFilter: (req, file, callback) => {
    //     callback(null, !!imageTypes[file.mimetype])
    // }

const upload = multer({ storage })

// some browsers request this automatically, ignoring for now
app.get('/favicon.ico', (req, res, next) => {
    return
})

// debug endpoint
app.get('/', function(req,res,next) {
    console.log("loading debug page")
    res.render("visualizer", {
        role: "debug"
    })
})

function extractPhotoUrlFromForeignObject(svg) {
  const m = svg.match(/<img[^>]*\ssrc="([^"]+\/photo)"[^>]*>/i);
  return m ? m[1] : null;
}

function replaceForeignObjectWithImage(svg, dataUri) {
  if (!dataUri) return svg;

  // Remove the whole <foreignObject ...>...</foreignObject>
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/i, "");

  // Insert an SVG <image> as the very first child inside <svg ...>
  const imageTag =
    `<image id="export-base-image" href="${dataUri}" ` +
    `x="0" y="0" width="100%" height="100%" ` +
    `preserveAspectRatio="none"></image>`;

  return svg.replace(/<svg\b([^>]*)>/, `<svg$1>${imageTag}`);
}

function parsePointResponse(resp) {
  if (!resp || typeof resp !== "string") return [];
  return resp.split("|").map(s => {
    const mx = s.match(/x:\s*([0-9.+-eE]+)/);
    const my = s.match(/y:\s*([0-9.+-eE]+)/);
    if (!mx || !my) return null;
    return { x: Number(mx[1]), y: Number(my[1]) };
  }).filter(Boolean);
}

function injectMarksIntoSvg(svg, points) {
  const marks = points.map((p, i) => `
    <g>
      <circle cx="${p.x}" cy="${p.y}" r="8" fill="rgba(255,0,0,0.75)" stroke="white" stroke-width="2" />
      <text x="${p.x + 10}" y="${p.y - 10}" font-size="14" fill="red" font-family="Arial">${i + 1}</text>
    </g>
  `).join("");

  const layer = `<g class="export-mark-layer">${marks}</g>`;

  if (!svg.includes("</svg>")) return svg + layer;
  return svg.replace("</svg>", `${layer}</svg>`);
}


function clearBeforeUpload(req, res, next) {
    if (fs.existsSync(`${__dirname}/uploads/${req.params.id}.png`))
        fs.unlinkSync(`${__dirname}/uploads/${req.params.id}.png`)
    else if (fs.existsSync(`${__dirname}/uploads/${req.params.id}.jpg`))
        fs.unlinkSync(`${__dirname}/uploads/${req.params.id}.jpg`)

    next()
}

// ui post
app.post('/:id/photo', clearBeforeUpload, upload.single("file"), function(req,res,next) {
    
    res.send()
    //res.redirect(req.get("Referrer"))
})

app.post('/', async function(req,res,next) {
    try {
        const response = await api.post(req.originalUrl, req.body)
        res.send()
    } catch (e) {
        next(e)
    }
})

// Chunked upload endpoints
app.post('/:id/upload/init', async function(req,res,next) {
    try {
        const response = await api.post(req.originalUrl, req.body)
        res.status(200).send(response.data)
    } catch (e) {
        next(e)
    }
})

app.post('/:id/upload/chunk', async function(req,res,next) {
    try {
        const response = await api.post(req.originalUrl, req.body)
        res.status(200).send(response.data)
    } catch (e) {
        next(e)
    }
})

app.post('/:id/upload/finalize', async function(req,res,next) {
    try {
        const response = await api.post(req.originalUrl, req.body)

        // Notify main API to update the visualization's updatedAt timestamp
        try {
            await mainApi.post(`/visualizations/content/${req.params.id}/touch`)
        } catch (touchError) {
            console.error(`Failed to update visualization timestamp for contentId ${req.params.id}:`, touchError.message)
        }

        res.status(204).send()
    } catch (e) {
        next(e)
    }
})

// ui put (keep for backwards compatibility with non-chunked uploads)
app.put('/:id', async function(req,res,next) {
    try {
        await api.put(req.originalUrl, req.body)

        // Notify main API to update the visualization's updatedAt timestamp
        try {
            await mainApi.post(`/visualizations/content/${req.params.id}/touch`)
        } catch (touchError) {
            // Log error but don't fail the request if timestamp update fails
            console.error(`Failed to update visualization timestamp for contentId ${req.params.id}:`, touchError.message)
        }

        res.status(204).send()
    } catch (e) {
        console.error(`[UI Server] PUT error:`, e.message)
        next(e)
    }
})

// endpoint to load photo
app.get('/:id/photo', async function(req,res,next) {
    try {
        const pngPath = `${__dirname}/uploads/${req.params.id}.png`
        const jpgPath = `${__dirname}/uploads/${req.params.id}.jpg`

        if (fs.existsSync(pngPath)) {
            res.sendFile(pngPath)
        } else {
            res.sendFile(jpgPath)
        }
    } catch (e) {
        console.error(`[UI Server] Error serving photo:`, e.message)
        next(e)
    }
})

// New endpoint to get SVG data only (for AJAX loading)
app.get('/:id/svg-data', async function(req,res,next) {
    try {
        const response = await api.get(`/${req.params.id}`)
        res.status(200).json({ svg: response.data.svg, detailsOnHover: response.data.detailsOnHover})
    } catch (e) {
        console.error(`[UI Server] GET svg-data error:`, e.message)
        next(e)
    }
})

// New endpoint: render PNG with marks from SVG stored in visual-api
// /:id/marked.png?points=ENCODED_STRING
app.get('/:id/marked.png', async function(req, res, next) {
  try {
    const Resvg = getResvg(); // lazy load here

    const id = req.params.id;
    const pointsStr = String(req.query.points || "");
    const points = parsePointResponse(pointsStr);

    // Same source as /svg-data
    const response = await api.get(`/${id}`);
    const svg = response?.data?.svg;

    if (!svg || typeof svg !== "string" || !svg.trim().startsWith("<svg")) {
      return res.status(404).send("No SVG found for this visualization.");
    }

    // Convert foreignObject <img src=".../photo"> into real SVG <image href="data:...">
    let svgForRender = svg;
    const photoUrl = extractPhotoUrlFromForeignObject(svgForRender);

    if (photoUrl) {
      const photoResp = await axios.get(photoUrl, { responseType: "arraybuffer" });
      const contentType = photoResp.headers["content-type"] || "image/png";
      const b64 = Buffer.from(photoResp.data).toString("base64");
      const dataUri = `data:${contentType};base64,${b64}`;

      svgForRender = replaceForeignObjectWithImage(svgForRender, dataUri);
    }

    // Add marks
    const svgWithMarks = points.length
      ? injectMarksIntoSvg(svgForRender, points)
      : svgForRender;

    // Render SVG -> PNG
    const resvg = new Resvg(svgWithMarks, { fitTo: { mode: "original" } });
    const pngData = resvg.render().asPng();

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(Buffer.from(pngData));
  } catch (e) {
    console.error(`[UI Server] GET marked.png error:`, e);
    next(e);
  }
});


// endpoint to load specific visualization
app.get('/:id', async function(req,res,next) {
    try {
        const firstQuery = Object.keys(req.query)[0];
        let static = req.query.static;
        static = static || false;
        if (firstQuery != "static"){
            res.render("visualizer", {
                role: firstQuery,
                static: static
                // SVG will be loaded via AJAX to prevent UI freezing
            })
        } else {
            res.render("visualizer", {
                static: static
            })
        }
    } catch (e) {
        next(e)
    }
})

// catch-all
app.use('*', function (req, res, next) {
    res.status(404).send({
        error: "Requested resource " + req.originalUrl + " does not exist"
    })
})

// error case
app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        error: "Server error.  Please try again later."
    })
})

// start server
app.listen(process.env.VISUAL_UI_PORT, function () {
    console.log("== Server is running on port", process.env.VISUAL_UI_PORT)
})