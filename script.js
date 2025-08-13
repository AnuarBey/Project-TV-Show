//You can edit ALL of the code here

let allEpisodes = []; // store all episodes globally so that other functions can access it.

window.onload = setup;

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

    allEpisodes = episodeList;
    makePageForEpisodes(episodeList);
    initEventListeners();
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

  //create div to hold all episode cards
  const episodeListElem = document.createElement("div");
  episodeListElem.id = "episode-list";
  rootElem.appendChild(episodeListElem);

  //clone and fill episode details from template
  const template = document.getElementById("episode-template");

  episodeList.forEach((episode) => {
    const episodeCard = template.content.cloneNode(true);

    const codeAndSeason = `S${String(episode.season).padStart(2, "0")}E${String(
      episode.number
    ).padStart(2, "0")}`;

    episodeCard.querySelector(".episode-card").id = codeAndSeason;
    episodeCard.querySelector(".episode-title").textContent = episode.name;
    episodeCard.querySelector(".episode-code").textContent = codeAndSeason;
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

  updateEpisodeSelect();

}

function updateEpisodeSelect() {
  //query the selector select
  const selectEpisodeList = document.querySelector("#drop-down-search");
  if (!selectEpisodeList) return;

  selectEpisodeList.innerHTML = "";

  // default first option on select drop-down list
  const defaultOption = document.createElement("option");
  defaultOption.value = "allEpisodes"; //
  defaultOption.text = "--- Show all episodes ---";
  selectEpisodeList.appendChild(defaultOption);

  //Create episode option and set its value
  for (let i = 0; i < allEpisodes.length; i++) {
    const episodeCodeAndSeason = `S${String(allEpisodes[i].season).padStart(
      2,
      "0"
    )}E${String(allEpisodes[i].number).padStart(2, "0")}`;
    const option = document.createElement("option");
    option.setAttribute("value", episodeCodeAndSeason);
    option.text = `${episodeCodeAndSeason} - ${allEpisodes[i].name}`;
    selectEpisodeList.appendChild(option);
  }
}

// -----------TV shows drop-down select-----------
function updateTvShowSelect(){
const tvShows = document.querySelector("#tv-shows")
  const tvShowDefaultOption = document.createElement("option")
    tvShowDefaultOption.value = "allTvShows";
    tvShowDefaultOption.text = "--Choose Tv show--";
    tvShows.appendChild(tvShowDefaultOption);
}
updateTvShowSelect();


function initEventListeners() {
  //this handles episode selection
  const selectEpisodeList = document.querySelector("#drop-down-search");

  if (selectEpisodeList) {
    selectEpisodeList.addEventListener("change", function () {
      const allEpisodeCode = this.value;
      const cards = document.querySelectorAll(".episode-card");

      //This is to remove any existing highlight from the card
      cards.forEach((card) => card.classList.remove("selected-episode"));

      if (allEpisodeCode === "allEpisodes") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // scrolls the page smoothly to the top
      } else {
        const card = document.getElementById(allEpisodeCode);
        if (card) {
          card.scrollIntoView({ behavior: "smooth" });
          card.classList.add("selected-episode");
        }
      }
    });
  }
}

//Get input field and listen to user type
const input = document.querySelector("input");
if (input) {
  input.addEventListener("keyup", function () {
    render(input);
  });
}

//filters episodes based on user search and re-render the page.
function render(input) {
  const value = (input?.value || "").toLowerCase();
  const filteredEpisodes = allEpisodes.filter(function (episode) {
    return (
      episode.name.toLowerCase().includes(value) ||
      (episode.summary && episode.summary.toLowerCase().includes(value))
    );
  });
  makePageForEpisodes(filteredEpisodes);
}
