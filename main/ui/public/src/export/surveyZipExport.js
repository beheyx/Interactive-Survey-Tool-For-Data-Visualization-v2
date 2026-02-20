const ExcelJS = require("exceljs");
const archiver = require("archiver");
const axios = require("axios");

function hasAnyPoints(resp) {
  return typeof resp === "string" && resp.trim().length > 0;
}

async function buildSurveyZipBundle({ pub, visualUiUrl }) {
  const participants = pub.results?.participants || [];
  const questions = (pub.questions || [])
    .slice()
    .sort((a, b) => (Number(a.number ?? 0) - Number(b.number ?? 0)) || (Number(a.id ?? 0) - Number(b.id ?? 0)));

  const workbook = new ExcelJS.Workbook();
  const images = []; // { zipPath, buffer }

  for (const question of questions) {
    const sheet = workbook.addWorksheet(`Question ${question.number}`);

    sheet.addRow([`Question ${question.number}: ${question.text}`]);
    sheet.getRow(1).font = { bold: true };

    sheet.addRow(["Participant ID", "Response", "Comment"]);
    sheet.getRow(2).font = { bold: true };

    sheet.columns = [{ width: 20 }, { width: 40 }, { width: 40 }];
    sheet.views = [{ state: "frozen", ySplit: 2 }];

    const isMarkPoints = question.type === "Mark Points";

    for (const p of participants) {
      if (!Array.isArray(p.answers)) continue;

      const answer = p.answers.find(a => String(a.questionNumber) === String(question.number));
      if (!answer) continue;

      const row = sheet.addRow([p.participantId, "", answer.comment ?? ""]);
      const respCell = row.getCell(2);

      if (!isMarkPoints) {
        respCell.value = answer.response ?? "";
        continue;
      }

      if (!question.visualizationContentId) {
        respCell.value = "(missing visualizationContentId)";
        continue;
      }

      if (!hasAnyPoints(answer.response)) {
        respCell.value = "(no points)";
        continue;
      }

      const encodedPoints = encodeURIComponent(String(answer.response));
      const markedUrl = `${visualUiUrl}/${question.visualizationContentId}/marked.png?points=${encodedPoints}`;


      const pngResp = await axios.get(markedUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(pngResp.data);

      const safePid = String(p.participantId).replace(/[^\w.-]+/g, "_");
      const imageName = `q${question.number}_p${safePid}.png`;
      const zipPath = `images/${imageName}`;

      images.push({ zipPath, buffer });

      respCell.value = { text: "View marked image", hyperlink: zipPath };
      respCell.font = { color: { argb: "FF0000FF" }, underline: true };
    }
  }

  return { workbook, images };
}

async function streamSurveyZip(res, { pubName, pubStatus, workbook, images }) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${String(pubName).replace(/\W+/g, "_")}-${pubStatus}-results.zip"`
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => { throw err; });

  archive.pipe(res);

  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  archive.append(Buffer.from(xlsxBuffer), { name: "survey-results.xlsx" });

  for (const img of images) {
    archive.append(img.buffer, { name: img.zipPath });
  }

  await archive.finalize();
}

module.exports = { buildSurveyZipBundle, streamSurveyZip };
