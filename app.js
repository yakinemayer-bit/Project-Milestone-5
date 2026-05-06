// ====== CONFIG ======
const TMDB_API_KEY = 'b66820c2c194286755bb49fe79e9227b'; // your key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w200';

const RESULTS_PER_VIEW = 10;
const MAX_RESULTS = 50;

// State for search
let searchState = {
  query: '',
  viewPage: 1,
  totalResults: 0,
  movies: []
};

// State for collection
let collectionState = {
  page: 1,
  totalResults: 0,
  movies: []
};

// Current layout: 'grid' or 'list'
let currentView = 'grid';

$(document).ready(function () {
  // Nav
  $('#nav-search, #search-pill').on('click', function () {
    setNav('search');
  });

  $('#nav-collection, #collection-pill').on('click', function () {
    setNav('collection');
    if (!collectionState.movies.length) {
      loadCollection(1);
    }
  });

  // View toggle
  $('#view-grid').on('click', function () {
    setView('grid');
  });

  $('#view-list').on('click', function () {
    setView('list');
  });

  // Search
  $('#btnSearch').on('click', function () {
    runSearch();
  });

  $('#searchTerm').on('keydown', function (event) {
    if (event.key === 'Enter') {
      runSearch();
    }
  });

  $('#search-prev').on('click', function () {
    changeSearchViewPage(searchState.viewPage - 1);
  });

  $('#search-next').on('click', function () {
    changeSearchViewPage(searchState.viewPage + 1);
  });

  // Collection pagination
  $('#collection-prev').on('click', function () {
    changeCollectionPage(collectionState.page - 1);
  });

  $('#collection-next').on('click', function () {
    changeCollectionPage(collectionState.page + 1);
  });

  // Click handlers (delegated) for items
  $('#search-results').on('click', '.movie-card, .movie-row', function () {
    const id = $(this).data('id');
    loadDetails(id);
  });

  $('#collection-results').on('click', '.movie-card, .movie-row', function () {
    const id = $(this).data('id');
    loadDetails(id);
  });

  updateSummaryTable();
});

// ====== View / Nav helpers ======
function setNav(section) {
  if (section === 'search') {
    $('#search-section').show();
    $('#collection-section').hide();
    $('#nav-search').addClass('active btn-danger').removeClass('btn-outline-light');
    $('#nav-collection').removeClass('active btn-danger').addClass('btn-outline-light');
    $('#search-pill').addClass('active');
    $('#collection-pill').removeClass('active');
  } else {
    $('#search-section').hide();
    $('#collection-section').show();
    $('#nav-search').removeClass('active btn-danger').addClass('btn-outline-light');
    $('#nav-collection').addClass('active btn-danger').removeClass('btn-outline-light');
    $('#search-pill').removeClass('active');
    $('#collection-pill').addClass('active');
  }
  updateSummaryTable();
}

function setView(view) {
  currentView = view;
  $('#view-grid').toggleClass('active', view === 'grid');
  $('#view-list').toggleClass('active', view === 'list');

  const searchContainer = $('#search-results');
  const collContainer = $('#collection-results');

  if (view === 'grid') {
    searchContainer.removeClass('list-view').addClass('grid-view');
    collContainer.removeClass('list-view').addClass('grid-view');
  } else {
    searchContainer.removeClass('grid-view').addClass('list-view');
    collContainer.removeClass('grid-view').addClass('list-view');
  }

  // Re-render current results to change template
  renderSearchPageView();
  renderCollection();
  updateSummaryTable();
}

// ====== Search movies ======
function runSearch() {
  const term = $('#searchTerm').val().trim();
  if (!term) {
    $('#search-results').html('<div class="alert alert-warning mb-0">Please enter a movie title.</div>');
    $('#search-pagination').hide();
    return;
  }
  setNav('search');
  searchMovies(term);
}

function searchMovies(query) {
  searchState.query = query;
  searchState.viewPage = 1;

  const url = `${TMDB_BASE_URL}/search/movie`;
  $('#search-results').html('<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><p class="text-secondary mt-3 mb-0">Loading movies...</p></div>');

  $.ajax({
    url: url,
    method: 'GET',
    data: {
      api_key: TMDB_API_KEY,
      query: query,
      page: 1,
      include_adult: false
    }
  }).done(function (data) {
    const results = data.results || [];
    searchState.totalResults = Math.min(data.total_results || 0, MAX_RESULTS);
    searchState.movies = results.slice(0, MAX_RESULTS);
    renderSearchPageView();
  }).fail(function () {
    $('#search-results').html('<div class="alert alert-danger mb-0">Error loading search results.</div>');
    $('#search-pagination').hide();
  }).always(function () {
    updateSummaryTable();
  });
}

function changeSearchViewPage(newViewPage) {
  const totalPages = getSearchPageCount();
  if (newViewPage < 1 || newViewPage > totalPages) return;
  searchState.viewPage = newViewPage;
  renderSearchPageView();
}

function renderSearchPageView() {
  const $container = $('#search-results');
  $container.empty();

  if (!searchState.movies.length) {
    $container.html('<div class="alert alert-secondary mb-0">No results found.</div>');
    $('#search-pagination').hide();
    updateSummaryTable();
    return;
  }

  const startIndex = (searchState.viewPage - 1) * RESULTS_PER_VIEW;
  const endIndex = startIndex + RESULTS_PER_VIEW;
  const slice = searchState.movies.slice(startIndex, endIndex);

  slice.forEach(movie => {
    const viewData = prepareMovieViewData(movie);
    const html = renderMovieItem(viewData);
    $container.append(html);
  });

  $('#search-pagination').show();
  $('#search-page-info').text(`Page ${searchState.viewPage} of ${getSearchPageCount()}`);
  $('#search-prev').prop('disabled', searchState.viewPage === 1);
  $('#search-next').prop('disabled', searchState.viewPage === getSearchPageCount());
  updateSummaryTable();
}

// ====== Collection (Popular) ======
function loadCollection(page) {
  const url = `${TMDB_BASE_URL}/movie/popular`;
  $('#collection-results').html('<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><p class="text-secondary mt-3 mb-0">Loading popular movies...</p></div>');

  $.ajax({
    url: url,
    method: 'GET',
    data: {
      api_key: TMDB_API_KEY,
      page: page
    }
  }).done(function (data) {
    collectionState.page = data.page || 1;
    collectionState.totalResults = data.total_results || 0;
    collectionState.movies = (data.results || []).slice(0, RESULTS_PER_VIEW);
    renderCollection();
  }).fail(function () {
    $('#collection-results').html('<div class="alert alert-danger mb-0">Error loading popular movies.</div>');
    $('#collection-pagination').hide();
  }).always(function () {
    updateSummaryTable();
  });
}

function changeCollectionPage(newPage) {
  if (newPage < 1) return;
  loadCollection(newPage);
}

function renderCollection() {
  const $container = $('#collection-results');
  $container.empty();

  if (!collectionState.movies.length) {
    $container.html('<div class="alert alert-secondary mb-0">No movies found.</div>');
    $('#collection-pagination').hide();
    updateSummaryTable();
    return;
  }

  collectionState.movies.forEach(movie => {
    const viewData = prepareMovieViewData(movie);
    const html = renderMovieItem(viewData);
    $container.append(html);
  });

  $('#collection-pagination').show();
  $('#collection-page-info').text(`TMDB page ${collectionState.page}`);
  $('#collection-prev').prop('disabled', collectionState.page === 1);
  $('#collection-next').prop('disabled', false);
  updateSummaryTable();
}

// ====== Movie details ======
function loadDetails(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}`;

  $.ajax({
    url: url,
    method: 'GET',
    data: {
      api_key: TMDB_API_KEY
    }
  }).done(function (data) {
    const viewData = prepareDetailsViewData(data);
    const template = $('#movie-details-template').html();
    const html = Mustache.render(template, viewData);
    $('#details-content').html(html);
    document.getElementById('details-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }).fail(function () {
    $('#details-content').html('<div class="alert alert-danger mb-0">Error loading movie details.</div>');
  });
}

function getSearchPageCount() {
  return Math.max(1, Math.ceil(searchState.movies.length / RESULTS_PER_VIEW));
}

function updateSummaryTable() {
  const activeSection = $('#collection-section').is(':visible') ? 'Popular Movies' : 'Search Results';
  const searchLabel = searchState.query || 'None yet';
  const searchCount = searchState.movies.length ? `${searchState.movies.length} loaded` : 'No search results';
  const collectionLabel = collectionState.movies.length ? `Page ${collectionState.page}` : 'Not loaded';

  $('#summary-table').html(`
    <tr>
      <th scope="row">Active Section</th>
      <td>${activeSection}</td>
    </tr>
    <tr>
      <th scope="row">Latest Search</th>
      <td>${searchLabel}</td>
    </tr>
    <tr>
      <th scope="row">Search Results</th>
      <td>${searchCount}</td>
    </tr>
    <tr>
      <th scope="row">Current View</th>
      <td>${currentView === 'grid' ? 'Grid' : 'List'}</td>
    </tr>
    <tr>
      <th scope="row">Popular Collection</th>
      <td>${collectionLabel}</td>
    </tr>
  `);
}

// ====== Mustache view helpers ======
function prepareMovieViewData(movie) {
  const poster_full = movie.poster_path
    ? TMDB_IMG_BASE + movie.poster_path
    : '';

  let short_overview = movie.overview || '';
  if (short_overview.length > 120) {
    short_overview = short_overview.substring(0, 117) + '...';
  }

  return {
    id: movie.id,
    title: movie.title || 'No title',
    poster_full: poster_full,
    short_overview: short_overview || 'No overview available.',
    release_date: movie.release_date || 'Unknown',
    vote_average:
      typeof movie.vote_average === 'number'
        ? movie.vote_average.toFixed(1)
        : 'N/A',
    viewClass: currentView === 'grid' ? 'grid-item' : 'list-item'
  };
}

function renderMovieItem(viewData) {
  if (currentView === 'grid') {
    const template = $('#movie-card-template').html();
    return Mustache.render(template, viewData);
  } else {
    const template = $('#movie-list-item-template').html();
    return Mustache.render(template, viewData);
  }
}

function prepareDetailsViewData(movie) {
  const poster_full = movie.poster_path
    ? TMDB_IMG_BASE + movie.poster_path
    : '';

  return {
    title: movie.title || 'No title',
    poster_full: poster_full,
    overview: movie.overview || 'No overview available.',
    release_date: movie.release_date || 'Unknown',
    vote_average:
      typeof movie.vote_average === 'number'
        ? movie.vote_average.toFixed(1)
        : 'N/A',
    original_language: movie.original_language || 'N/A',
    runtime: movie.runtime || 'N/A'
  };
}
