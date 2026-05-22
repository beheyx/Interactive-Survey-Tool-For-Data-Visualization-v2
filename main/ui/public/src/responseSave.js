import questionTypes from "./questionTypes.mjs"

// Reduce lasso points so complex shapes do not create huge cookie payloads
function simplifyRegionResponse(response) {
    if (!response) return response

    // If response was already stringified somewhere else, try to parse it
    let parsed = response
    if (typeof response === "string") {
        try {
            parsed = JSON.parse(response)
        } catch {
            return response
        }
    }

    // Handle single region object
    if (parsed.type === "lasso" && Array.isArray(parsed.points)) {
        return {
            ...parsed,
            points: simplifyPoints(parsed.points)
        }
    }

    // Handle multiple region answers if your region tool returns an array
    if (Array.isArray(parsed)) {
        return parsed.map(region => {
            if (region?.type === "lasso" && Array.isArray(region.points)) {
                return {
                    ...region,
                    points: simplifyPoints(region.points)
                }
            }
            return region
        })
    }

    return parsed
}

// Keeps every Nth point and rounds coordinates
function simplifyPoints(points) {
    const MAX_POINTS = 150

    if (!Array.isArray(points)) return []

    const step = Math.max(1, Math.ceil(points.length / MAX_POINTS))

    const simplified = points
        .filter((_, index) => index % step === 0)
        .map(point => ({
            x: Math.round(Number(point.x) * 100) / 100,
            y: Math.round(Number(point.y) * 100) / 100
        }))
        .filter(point =>
            Number.isFinite(point.x) &&
            Number.isFinite(point.y)
        )

    // Lasso needs at least 3 points
    return simplified.length >= 3 ? simplified : points.slice(0, 3)
}

// save answer as a cookie
export default function saveAnswer(onDoneSaving) {
    const requirements = document.getElementById("requirements")
    const questionType = requirements.getAttribute("questionType")
    const number = requirements.getAttribute("number")

    // get comment, if available
    let comment = ""
    const commentEl = document.getElementById("comment")
    if (commentEl) {
        comment = commentEl.value.trim()
    }

    // callback func for after getting response, sends answer to cookie
    function sendToCookie(response) {
        const cleanedResponse = simplifyRegionResponse(response)

        fetch(window.location.href, {
            method: "PATCH",
            body: JSON.stringify({
                answer: {
                    questionNumber: number,
                    comment: comment,
                    response: cleanedResponse
                }
            }),
            headers: {
                "Content-type": "application/json",
            },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to save answer: ${res.status}`)
                }
                return res
            })
            .then(onDoneSaving)
            .catch(err => {
                console.error("Error saving answer:", err)
                alert("There was an error saving your answer. Try drawing a smaller region.")
            })
    }

    // get response, format of response depends on response type
    const typeInfo = questionTypes.filter(type => type.name == questionType)[0]
    typeInfo.getResponse(sendToCookie)
}