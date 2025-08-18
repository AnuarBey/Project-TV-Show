//You can edit ALL of the code here

const BASE_URL = "https://api.tvmaze.com";
// Global variables
let allEpisodes = []; // store all episodes globally so that other functions can access it.
let allTvShows = []; // store all Tv shows globally.
let showEpisodesCache = {}; // Store fetched episodes to prevent duplicate fetches from Api.
let currentView = "shows"; // Track current view: 'shows' or 'episodes'
let currentShowId = null; // Track current show when viewing episodes

// Abort any previous fetch request
let episodesAbort;
const rootElem = document.getElementById("root");
window.onload = setup;

async function setup() {
  try {
    // Show loading message
    showMessage("Loading shows...", "loading");

    // Only fetch TV shows - no more Game of Thrones episodes initially
    const responseTvShow = await fetch(`${BASE_URL}/shows`);

    if (!responseTvShow.ok) {
      throw new Error(`HTTP error! status: ${responseTvShow.status}`);
    }

    const dataTvShow = await responseTvShow.json();

    if (!Array.isArray(dataTvShow) || dataTvShow.length === 0) {
      throw new Error("No Tv show found");
    }

    const tvShowList = dataTvShow.map((show) => ({
      id: show.id,
      name: show.name,
      rating: show.rating?.average || "N/A",
      genres: show.genres.join(", "),
      status: show.status || "Unknown",
      runtime: show.runtime || "N/A",
      summary: show.summary,
      image: show.image?.medium || null,
    }));
    // sort tv shows alphabetically
    tvShowList.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    allTvShows = tvShowList;
    currentView = "shows"; // Set current view to shows
    makePageForTvShow(allTvShows); // Start with TV shows list
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

  const messageContainer = document.createElement("div");
  messageContainer.className = "message-container";

  // Add icon based on message type
  const icon = document.createElement("div");
  icon.className = "message-icon";
  if (type === "info") {
    icon.innerHTML = "🔍"; // Search icon for "no results"
  } else if (type === "error") {
    icon.innerHTML = "⚠️"; // Warning icon for errors
  } else if (type === "loading") {
    icon.innerHTML = "⏳"; // Loading icon
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  messageContainer.appendChild(icon);
  messageContainer.appendChild(messageDiv);

  //Suggestions for "no results" message
  if (type === "info" && message.includes("No")) {
    const suggestionDiv = document.createElement("div");
    suggestionDiv.className = "message-suggestions";
    suggestionDiv.innerHTML = `
    <p>Try:</p>
    <ul>
      <li>Different keywords</li>
      <li>Checking spelling</li>
      <li>More general search terms</li>
    </ul>
  `;

    //Added clear search button
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear Search";
    clearButton.className = "clear-search-button";
    clearButton.onclick = () => {
      const searchInput = document.querySelector("#search");
      if (searchInput) {
        searchInput.value = "";
        render(searchInput);
      }
    };
    messageContainer.appendChild(suggestionDiv);
    messageContainer.appendChild(clearButton);
  }
  // Add retry button for errors
  if (type === "error") {
    const retryButton = document.createElement("button");
    retryButton.textContent = "Try Again";
    retryButton.className = "retry-button";
    retryButton.onclick = setup;

    messageContainer.appendChild(retryButton);
  }

  // Append the entire container to root (not just messageDiv)
  rootElem.appendChild(messageContainer);
  // Hide counter when showing message
  updateContentCounter("", false);
}

// This will show the number of episodes or shows found
function updateContentCounter(text, show = true) {
  const counter = document.getElementById("content-count");
  if (counter) {
    counter.textContent = text;
    counter.style.display = show ? "block" : "none";
  }
}

function makePageForEpisodes(episodeList) {
  rootElem.innerHTML = "";
  currentView = "episodes"; // Set current view to episodes

  // If no episodes found, show message
  if (episodeList.length === 0) {
    showMessage("No episodes found matching your search.", "info");
    return;
  }

  // Function to update content counter
  updateContentCounter(`Got ${episodeList.length} episode(s)`);

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
    if (episode.image && episode.image.medium) {
      imgElement.src = episode.image.medium;
      imgElement.alt = `${episode.name} episode image`;
    } else {
      imgElement.style.display = "none";
    }

    // Add click event to Watch button
    const watchBtn = episodeCard.querySelector(".watch-btn");
    watchBtn.addEventListener("click", () => {
      watchEpisode(episode);
    });

    episodeListElem.appendChild(episodeCard);
  });
  updateEpisodeSelect();
  updateNavigationControls();
}

// Function to handle watching episode
function watchEpisode(episode) {
  const episodeUrl = episode.url || `${BASE_URL}/episodes/${episode.id}`;

  // Open in new tab
  window.open(episodeUrl, "_blank");
}

//--------Episodes drop-down select------
function updateEpisodeSelect() {
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

//tv show cards logic
function makePageForTvShow(showList) {
  rootElem.innerHTML = "";
  currentView = "shows"; // Set current view to shows

  // If no shows found, show message
  if (showList.length === 0) {
    showMessage("No shows found matching your search.", "info");
    return;
  }

  // Function to update content counter
  updateContentCounter(`Got ${showList.length} show(s)`);

  //create div to hold all tv show cards
  const showListDiv = document.createElement("div");
  showListDiv.id = "show-list";
  rootElem.appendChild(showListDiv);

  //clone Tv show  template
  const templateTvShow = document.getElementById("Tv-show-template");

  showList.forEach((show) => {
    const showCard = templateTvShow.content.cloneNode(true);

    showCard.querySelector(".tv-show-title").textContent = show.name;
    showCard.querySelector(
      ".tv-show-rating"
    ).textContent = `Rating: ${show.rating}`;
    showCard.querySelector(
      ".tv-show-genres"
    ).textContent = `Genres: ${show.genres}`;
    showCard.querySelector(
      ".tv-show-status"
    ).textContent = `Status: ${show.status}`;
    showCard.querySelector(
      ".tv-show-runtime"
    ).textContent = `Runtime: ${show.runtime} min`;
    showCard.querySelector(".tv-show-summary").innerHTML =
      show.summary || "No summary available";

    const button = showCard.querySelector(".btn");
    if (button) {
      button.type = "button";
      button.addEventListener("click", () => {
        currentShowId = show.id;
        fetchAndDisplayShowEpisodes(show.id);
      });
    }
    // Handle tv show missing images gracefully
    const imgElementTvShow = showCard.querySelector(".tv-show-img");
    if (show.image) {
      imgElementTvShow.src = show.image;
      imgElementTvShow.alt = `${show.name} poster`;
    } else {
      imgElementTvShow.style.display = "none";
    }
    showListDiv.appendChild(showCard);
  });
  updateTvShowSelect();
  updateNavigationControls();
}

// -----------TV shows drop-down select-----------
function updateTvShowSelect() {
  const tvShows = document.querySelector("#tv-shows");

  // Clear any existing options
  tvShows.innerHTML = "";

  const tvShowDefaultOption = document.createElement("option");
  tvShowDefaultOption.value = "allTvShows";
  tvShowDefaultOption.text = "--Choose Tv show--";
  tvShows.appendChild(tvShowDefaultOption);

  //Create Tv shows option and set value
  for (let i = 0; i < allTvShows.length; i++) {
    const option = document.createElement("option");
    option.setAttribute("value", allTvShows[i].id);
    option.text = allTvShows[i].name;
    tvShows.appendChild(option);
  }
}

// Navigation control visibility
function updateNavigationControls() {
  const tvShowSelect = document.querySelector("#tv-shows");
  const episodeSelect = document.querySelector("#drop-down-search");
  const backToShowsBtn = document.querySelector("#back-to-shows");
  const searchInput = document.querySelector("#search");

  if (currentView === "shows") {
    // Show view: hide episode controls, show TV show selector
    if (tvShowSelect) tvShowSelect.style.display = "block";
    if (episodeSelect) episodeSelect.style.display = "none";
    if (backToShowsBtn) backToShowsBtn.style.display = "none";
    if (searchInput) searchInput.placeholder = "Search shows...";
  } else if (currentView === "episodes") {
    // Episode view: show episode controls, hide TV show selector
    if (tvShowSelect) tvShowSelect.style.display = "none";
    if (episodeSelect) episodeSelect.style.display = "block";
    if (backToShowsBtn) backToShowsBtn.style.display = "block";
    if (searchInput) searchInput.placeholder = "Search episodes...";
  }
}

function returnToShowsListing() {
  allEpisodes = []; // Clear episodes
  currentView = "shows";
  currentShowId = null;
  makePageForTvShow(allTvShows);

  // Clear search input
  const searchInput = document.querySelector("#search");
  if (searchInput) searchInput.value = "";
}

// ------async function to fetch and display show episodes-------
async function fetchAndDisplayShowEpisodes(showId) {
  if (!showId || showId === "allTvShows") return;

  // Reset current show ID and view
  currentShowId = showId;
  currentView = "episodes";

  // If we are already viewing episodes for this show, return early
  if (showEpisodesCache[showId]) {
    allEpisodes = showEpisodesCache[showId];
    makePageForEpisodes(allEpisodes);

    // Clear search input if we are switching to episodes view
    const searchInput = document.querySelector("#search");
    if (searchInput) searchInput.value = "";
    return;
  }

  //
  if (episodesAbort) episodesAbort.abort();
  episodesAbort = new AbortController();
  const { signal } = episodesAbort;

  try {
    // Show loading message
    showMessage("Loading episodes...", "loading");

    const response = await fetch(`${BASE_URL}/shows/${showId}/episodes`, {
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const episodes = await response.json();

    const episodeList = episodes
      .map((episode) => ({
        id: episode.id,
        name: episode.name,
        season: episode.season,
        number: episode.number,
        summary: episode.summary,
        image: episode.image,
        url: episode.url,
      }))
      .sort((a, b) =>
        a.season === b.season ? a.number - b.number : a.season - b.season
      );
    //this will update global episodes and display them all.
    allEpisodes = episodeList;
    showEpisodesCache[showId] = episodeList; // saves to cache
    makePageForEpisodes(episodeList);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    showMessage("Error loading episodes for this show", "error");
  }
}

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

  const selectTvShow = document.querySelector("#tv-shows");
  if (selectTvShow) {
    selectTvShow.addEventListener("change", function () {
      const selectedTvShow = this.value;
      if (selectedTvShow === "allTvShows") {
        returnToShowsListing();
      } else {
        // Fetch and display episodes for selected show
        fetchAndDisplayShowEpisodes(selectedTvShow);
      }
    });
  }
  //Handle back to shows button
  const backToShowsBtn = document.querySelector("#back-to-shows");
  if (backToShowsBtn) {
    backToShowsBtn.addEventListener("click", returnToShowsListing);
  }

  //Get input field and listen to user type
  const input = document.querySelector("#search");
  if (input) {
    input.addEventListener("keyup", function () {
      render(input);
    });
  }
}

//filters episodes based on user search and re-render the page.
function render(input) {
  const value = (input?.value || "").toLowerCase();

  if (currentView === "episodes") {
    // We're viewing episodes - filter episodes
    const filteredEpisodes = allEpisodes.filter(function (episode) {
      return (
        episode.name.toLowerCase().includes(value) ||
        (episode.summary && episode.summary.toLowerCase().includes(value))
      );
    });
    makePageForEpisodes(filteredEpisodes);
  } else if (currentView === "shows") {
    // We're viewing TV shows - filter TV shows
    const filteredShows = allTvShows.filter(function (show) {
      return (
        show.name.toLowerCase().includes(value) ||
        show.genres.toLowerCase().includes(value) ||
        (show.summary && show.summary.toLowerCase().includes(value))
      );
    });
    makePageForTvShow(filteredShows);
  }
}
