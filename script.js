//You can edit ALL of the code here

async function setup() {
  try {
    // Show loading message
    showMessage("Loading episodes...", "loading");

    const response = await fetch("https://api.tvmaze.com/shows/82/episodes");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if we got valid data
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No episodes found for this show");
    }

    const episodeList = data
      .map((episode) => ({
        id: episode.id,
        name: episode.name,
        season: episode.season,
        number: episode.number,
        summary: episode.summary,
        image: episode.image,
      }))
      .sort((a, b) =>
        a.season === b.season ? a.number - b.number : a.season - b.season
      );

    makePageForEpisodes(episodeList);
  } catch (error) {
    console.error("Error fetching episodes:", error);

    let userMessage;

    // Provide specific error messages based on error type
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      userMessage =
        "Unable to connect to the server. Please check your internet connection and try again.";
    } else if (error.message.includes("HTTP error")) {
      userMessage =
        "The show data could not be loaded from the server. Please try again later.";
    } else if (error.message.includes("No episodes found")) {
      userMessage = "No episodes were found for this show.";
    } else {
      userMessage =
        "Something went wrong while loading the episodes. Please refresh the page and try again.";
    }
    showMessage(userMessage, "error");
  }
}

function showMessage(message, type = "info") {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const messageDiv = document.createElement("div");
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  // Add retry button for errors
  if (type === "error") {
    const retryButton = document.createElement("button");
    retryButton.textContent = "Try Again";
    retryButton.className = "retry-button";
    retryButton.onclick = setup;

    messageDiv.appendChild(document.createElement("br"));
    messageDiv.appendChild(retryButton);
  }

  rootElem.appendChild(messageDiv);
}

function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const header = document.createElement("div");
  header.id = "episode-count";
  header.textContent = `Got ${episodeList.length} episode(s)`;
  rootElem.appendChild(header);

  const episodeListElem = document.createElement("div");
  episodeListElem.id = "episode-list";
  rootElem.appendChild(episodeListElem);

  const template = document.getElementById("episode-template");

  episodeList.forEach((episode) => {
    const episodeCard = template.content.cloneNode(true);

    episodeCard.querySelector(".episode-title").textContent = episode.name;
    episodeCard.querySelector(".episode-code").textContent = `S${String(
      episode.season
    ).padStart(2, "0")}E${String(episode.number).padStart(2, "0")}`;
    episodeCard.querySelector(".episode-summary").innerHTML = episode.summary;

    // Handle missing images gracefully
    const imgElement = episodeCard.querySelector(".episode-img");
    if (episode.image.medium) {
      imgElement.src = episode.image.medium;
    } else {
      imgElement.style.display = "none";
    }

    episodeListElem.appendChild(episodeCard);
  });
}

window.onload = setup;
