/* Jiho Lee — personal academic site. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var ME = "Jiho Lee";

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var sectionNav = navLinks.map(function (link) {
    var href = link.getAttribute("href") || "";
    return href.charAt(0) === "#" ? { link: link, section: document.getElementById(href.slice(1)) } : null;
  }).filter(function (item) { return item && item.section; });

  function setActiveNav(activeLink, currentType) {
    navLinks.forEach(function (link) {
      if (link === activeLink) link.setAttribute("aria-current", currentType);
      else link.removeAttribute("aria-current");
    });
  }

  if (sectionNav.length) {
    var topbar = document.querySelector(".topbar");
    var navUpdateQueued = false;

    function updateActiveNav() {
      var activeLink = sectionNav[0].link;
      var activationLine = (topbar ? topbar.getBoundingClientRect().bottom : 0) + 16;
      sectionNav.forEach(function (item) {
        if (item.section.getBoundingClientRect().top <= activationLine) activeLink = item.link;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        activeLink = sectionNav[sectionNav.length - 1].link;
      }
      setActiveNav(activeLink, "location");
    }

    function scheduleNavUpdate() {
      if (navUpdateQueued) return;
      navUpdateQueued = true;
      requestAnimationFrame(function () {
        navUpdateQueued = false;
        updateActiveNav();
      });
    }

    sectionNav.forEach(function (item) {
      item.link.addEventListener("click", function () { setActiveNav(item.link, "location"); });
    });
    window.addEventListener("scroll", scheduleNavUpdate, { passive: true });
    window.addEventListener("resize", scheduleNavUpdate);
    window.addEventListener("load", scheduleNavUpdate);
    updateActiveNav();
  } else {
    var cvLink = document.querySelector('.nav-links a[href="cv.html"]');
    if (cvLink) setActiveNav(cvLink, "page");
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " HTTP " + r.status);
      return r.json();
    });
  }

  function formatDate(d) {
    if (!d) return "";
    var parts = String(d).split("-");
    var months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (parts.length >= 2 && months[+parts[1]]) return months[+parts[1]] + " " + parts[0];
    return d;
  }

  function initials(text) {
    return String(text || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (s) { return s.charAt(0).toUpperCase(); })
      .join("");
  }

  function renderAuthors(authors) {
    var span = el("span", "pub-authors");
    (authors || []).forEach(function (name, i) {
      if (i > 0) span.appendChild(document.createTextNode(", "));
      if (name === ME) span.appendChild(el("span", "me", name));
      else span.appendChild(document.createTextNode(name));
    });
    return span;
  }

  function renderLinks(links) {
    var wrap = el("div", "pub-links");
    var labels = { paper: "Paper", pdf: "PDF", arxiv: "arXiv", code: "Code", video: "Video", project: "Project Page" };
    Object.keys(labels).forEach(function (key) {
      var url = links && links[key];
      if (!url) return;
      var a = el("a", "chip chip-" + key);
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.appendChild(el("span", "chip-icon chip-icon-" + key));
      a.appendChild(document.createTextNode(labels[key]));
      wrap.appendChild(a);
    });
    return wrap;
  }

  function makeThumb(item, type) {
    var box = el("div", type + "-thumb");
    if (item.imageLabel) {
      box.className += " thumb-label";
      box.appendChild(el("span", type + "-thumb-status", item.imageLabel));
      return box;
    }
    if (item.image) {
      var img = document.createElement("img");
      img.alt = item.title;
      img.onerror = function () {
        box.innerHTML = "";
        box.appendChild(el("span", type + "-thumb-mark", initials(item.title)));
        box.appendChild(el("span", type + "-thumb-note", "Image unavailable"));
      };
      img.src = item.image;
      box.appendChild(img);
      return box;
    }
    box.appendChild(el("span", type + "-thumb-mark", initials(item.title)));
    box.appendChild(el("span", type + "-thumb-note", "Image unavailable"));
    return box;
  }

  function makeNewsItem(item) {
    var li = el("li");
    li.appendChild(el("span", "news-date", formatDate(item.date)));
    var body = el("span", "news-text");
    appendNewsText(body, item);
    li.appendChild(body);
    return li;
  }

  function appendNewsText(body, item) {
    var text = item.text || "";
    var phrases = item.linkPhrases ? item.linkPhrases.slice() : [];
    var matches = [];
    phrases.forEach(function (phrase) {
      var phraseText = typeof phrase === "string" ? phrase : phrase && phrase.text;
      var phraseUrl = typeof phrase === "string" ? item.link : phrase && (phrase.url || item.link);
      if (!phraseText || !phraseUrl) return;
      var start = text.indexOf(phraseText);
      if (start !== -1) {
        matches.push({ start: start, end: start + phraseText.length, text: phraseText, url: phraseUrl, type: "link" });
      }
    });
    (item.boldPhrases || []).forEach(function (phraseText) {
      if (!phraseText) return;
      var start = text.indexOf(phraseText);
      if (start !== -1) {
        matches.push({ start: start, end: start + phraseText.length, text: phraseText, type: "strong" });
      }
    });
    matches.sort(function (a, b) {
      return a.start - b.start || b.end - a.end;
    });

    var cursor = 0;
    matches.forEach(function (match) {
      if (match.start < cursor) return;
      if (match.start > cursor) body.appendChild(document.createTextNode(text.slice(cursor, match.start)));
      if (match.type === "link") {
        var a = el("a", "news-link", match.text);
        a.href = match.url;
        a.target = "_blank";
        a.rel = "noopener";
        body.appendChild(a);
      } else {
        body.appendChild(el("strong", "news-strong", match.text));
      }
      cursor = match.end;
    });
    if (cursor < text.length) body.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function renderNews(items) {
    var list = document.getElementById("news-list");
    if (!list) return;
    var oldBtn = document.getElementById("news-toggle");
    if (oldBtn) oldBtn.parentNode.removeChild(oldBtn);
    list.innerHTML = "";
    var sorted = (items || []).slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
    if (!sorted.length) {
      list.appendChild(el("li", "empty", "No news yet."));
      return;
    }

    var years = sorted.map(function (item) {
      return parseInt(String(item.date).split("-")[0], 10);
    }).filter(function (year) {
      return !isNaN(year);
    });
    var newestYear = years.length ? Math.max.apply(null, years) : new Date().getFullYear();
    var cutoffYear = newestYear - 2;
    var expanded = false;
    var visible = sorted.filter(function (item) {
      var year = parseInt(String(item.date).split("-")[0], 10);
      return !isNaN(year) && year >= cutoffYear;
    });
    var hidden = sorted.filter(function (item) {
      var year = parseInt(String(item.date).split("-")[0], 10);
      return isNaN(year) || year < cutoffYear;
    });

    function draw() {
      list.innerHTML = "";
      var itemsToShow = expanded ? sorted : visible;
      itemsToShow.forEach(function (item) { list.appendChild(makeNewsItem(item)); });
    }

    draw();

    if (hidden.length) {
      var btn = el("button", "news-toggle", "+ Show more (" + hidden.length + ")");
      btn.id = "news-toggle";
      btn.type = "button";
      btn.addEventListener("click", function () {
        expanded = !expanded;
        draw();
        btn.textContent = expanded ? "- Show less" : "+ Show more (" + hidden.length + ")";
      });
      list.insertAdjacentElement("afterend", btn);
    }
  }

  var allPapers = [];
  var SELECTED_FILTER = "__selected__";
  var activeKeywords = [];
  var searchTerm = "";
  var FIRST_AUTHOR_FILTER = "__first_author__";
  var FILTER_HIDDEN_KEYWORDS = {
    "Human Pose Estimation": true
  };
  var KEYWORD_COLORS = {
    "Active Learning": { color: "#f97316", bg: "rgba(249, 115, 22, 0.11)", border: "rgba(249, 115, 22, 0.28)", hover: "rgba(249, 115, 22, 0.18)" },
    "Machine Unlearning": { color: "#e11d48", bg: "rgba(225, 29, 72, 0.10)", border: "rgba(225, 29, 72, 0.26)", hover: "rgba(225, 29, 72, 0.17)" },
    "Multi-Task Learning": { color: "#0f766e", bg: "rgba(15, 118, 110, 0.10)", border: "rgba(15, 118, 110, 0.25)", hover: "rgba(15, 118, 110, 0.17)" },
    "Robot Learning": { color: "#2563eb", bg: "rgba(37, 99, 235, 0.10)", border: "rgba(37, 99, 235, 0.24)", hover: "rgba(37, 99, 235, 0.17)" },
    "Foundation Model": { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.10)", border: "rgba(124, 58, 237, 0.24)", hover: "rgba(124, 58, 237, 0.16)" },
    "Task Planning": { color: "#65a30d", bg: "rgba(101, 163, 13, 0.11)", border: "rgba(101, 163, 13, 0.26)", hover: "rgba(101, 163, 13, 0.18)" },
    "Human Pose Estimation": { color: "#db2777", bg: "rgba(219, 39, 119, 0.10)", border: "rgba(219, 39, 119, 0.24)", hover: "rgba(219, 39, 119, 0.17)" },
    "Neural Architecture Search": { color: "#c026d3", bg: "rgba(192, 38, 211, 0.10)", border: "rgba(192, 38, 211, 0.24)", hover: "rgba(192, 38, 211, 0.17)" },
    "Vision-Language-Action Models": { color: "#16a34a", bg: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.25)", hover: "rgba(22, 163, 74, 0.17)" },
    "Test-Time Adaptation": { color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.10)", border: "rgba(14, 165, 233, 0.24)", hover: "rgba(14, 165, 233, 0.17)" },
    "Continual Learning": { color: "#0d9488", bg: "rgba(13, 148, 136, 0.10)", border: "rgba(13, 148, 136, 0.25)", hover: "rgba(13, 148, 136, 0.17)" },
    "Multi-Modal Learning": { color: "#4f46e5", bg: "rgba(79, 70, 229, 0.10)", border: "rgba(79, 70, 229, 0.24)", hover: "rgba(79, 70, 229, 0.16)" },
    "Automated Deep Learning": { color: "#6d28d9", bg: "rgba(109, 40, 217, 0.10)", border: "rgba(109, 40, 217, 0.24)", hover: "rgba(109, 40, 217, 0.17)" },
    "Service Robots": { color: "#15803d", bg: "rgba(21, 128, 61, 0.10)", border: "rgba(21, 128, 61, 0.24)", hover: "rgba(21, 128, 61, 0.17)" },
    "Robot Vision": { color: "#0369a1", bg: "rgba(3, 105, 161, 0.10)", border: "rgba(3, 105, 161, 0.24)", hover: "rgba(3, 105, 161, 0.17)" },
    "Sequential Data": { color: "#a16207", bg: "rgba(161, 98, 7, 0.11)", border: "rgba(161, 98, 7, 0.25)", hover: "rgba(161, 98, 7, 0.18)" },
    "Transferable Knowledge": { color: "#ea580c", bg: "rgba(234, 88, 12, 0.10)", border: "rgba(234, 88, 12, 0.24)", hover: "rgba(234, 88, 12, 0.17)" },
    "Pose Estimation": { color: "#be185d", bg: "rgba(190, 24, 93, 0.10)", border: "rgba(190, 24, 93, 0.24)", hover: "rgba(190, 24, 93, 0.17)" },
    "Face Recognition": { color: "#7c2d12", bg: "rgba(124, 45, 18, 0.10)", border: "rgba(124, 45, 18, 0.24)", hover: "rgba(124, 45, 18, 0.17)" },
    "iOS Application": { color: "#0284c7", bg: "rgba(2, 132, 199, 0.10)", border: "rgba(2, 132, 199, 0.24)", hover: "rgba(2, 132, 199, 0.17)" },
    "Mobile App": { color: "#1d4ed8", bg: "rgba(29, 78, 216, 0.10)", border: "rgba(29, 78, 216, 0.24)", hover: "rgba(29, 78, 216, 0.17)" },
    "Healthcare Device": { color: "#dc2626", bg: "rgba(220, 38, 38, 0.10)", border: "rgba(220, 38, 38, 0.26)", hover: "rgba(220, 38, 38, 0.17)" },
    "RFID Communication": { color: "#9333ea", bg: "rgba(147, 51, 234, 0.10)", border: "rgba(147, 51, 234, 0.24)", hover: "rgba(147, 51, 234, 0.16)" }
  };
  var KEYWORD_COLOR_POOL = [
    { color: "#2563eb", bg: "rgba(37, 99, 235, 0.10)", border: "rgba(37, 99, 235, 0.24)", hover: "rgba(37, 99, 235, 0.17)" },
    { color: "#f97316", bg: "rgba(249, 115, 22, 0.11)", border: "rgba(249, 115, 22, 0.28)", hover: "rgba(249, 115, 22, 0.18)" },
    { color: "#16a34a", bg: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.25)", hover: "rgba(22, 163, 74, 0.17)" },
    { color: "#e11d48", bg: "rgba(225, 29, 72, 0.10)", border: "rgba(225, 29, 72, 0.26)", hover: "rgba(225, 29, 72, 0.17)" },
    { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.10)", border: "rgba(124, 58, 237, 0.24)", hover: "rgba(124, 58, 237, 0.16)" },
    { color: "#0f766e", bg: "rgba(15, 118, 110, 0.10)", border: "rgba(15, 118, 110, 0.25)", hover: "rgba(15, 118, 110, 0.17)" },
    { color: "#db2777", bg: "rgba(219, 39, 119, 0.10)", border: "rgba(219, 39, 119, 0.24)", hover: "rgba(219, 39, 119, 0.17)" },
    { color: "#65a30d", bg: "rgba(101, 163, 13, 0.11)", border: "rgba(101, 163, 13, 0.26)", hover: "rgba(101, 163, 13, 0.18)" },
    { color: "#c026d3", bg: "rgba(192, 38, 211, 0.10)", border: "rgba(192, 38, 211, 0.24)", hover: "rgba(192, 38, 211, 0.17)" }
  ];

  function sortKeywords(keywords) {
    return (keywords || []).slice().filter(Boolean).sort(function (a, b) {
      return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
    });
  }

  function fallbackKeywordColor(keyword) {
    var hash = 0;
    for (var i = 0; i < keyword.length; i++) {
      hash = ((hash << 5) - hash) + keyword.charCodeAt(i);
      hash |= 0;
    }
    return KEYWORD_COLOR_POOL[Math.abs(hash) % KEYWORD_COLOR_POOL.length];
  }

  function applyKeywordColor(node, keyword) {
    var colors = KEYWORD_COLORS[keyword] || fallbackKeywordColor(keyword);
    node.style.setProperty("--keyword-color", colors.color);
    node.style.setProperty("--keyword-bg", colors.bg);
    node.style.setProperty("--keyword-border", colors.border);
    node.style.setProperty("--keyword-hover-bg", colors.hover);
  }

  function makeTag(keyword) {
    var tag = el("span", "tag keyword-colored", keyword);
    applyKeywordColor(tag, keyword);
    return tag;
  }

  function appendLinkedText(node, text, links) {
    var matches = [];
    (links || []).forEach(function (link) {
      if (!link || !link.text || !link.url) return;
      var start = String(text).indexOf(link.text);
      if (start !== -1) {
        matches.push({ start: start, end: start + link.text.length, text: link.text, url: link.url });
      }
    });
    matches.sort(function (a, b) {
      return a.start - b.start || b.end - a.end;
    });

    var cursor = 0;
    matches.forEach(function (match) {
      if (match.start < cursor) return;
      if (match.start > cursor) node.appendChild(document.createTextNode(text.slice(cursor, match.start)));
      var a = el("a", "", match.text);
      a.href = match.url;
      a.target = "_blank";
      a.rel = "noopener";
      node.appendChild(a);
      cursor = match.end;
    });
    if (cursor < text.length) node.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function paperMatches(p) {
    var keywords = p.keywords || [];
    if (activeKeywords.indexOf(FIRST_AUTHOR_FILTER) !== -1 && (!p.authors || p.authors[0] !== ME)) return false;
    if (activeKeywords.indexOf(SELECTED_FILTER) !== -1 && !p.selected) return false;
    for (var i = 0; i < activeKeywords.length; i++) {
      var active = activeKeywords[i];
      if (active !== FIRST_AUTHOR_FILTER && active !== SELECTED_FILTER && keywords.indexOf(active) === -1) return false;
    }
    if (searchTerm) {
      var hay = [
        p.title,
        (p.authors || []).join(" "),
        p.venue,
        String(p.year || ""),
        keywords.join(" ")
      ].join(" ").toLowerCase();
      if (hay.indexOf(searchTerm) === -1) return false;
    }
    return true;
  }

  function updateFilterLabel() {
    var label = document.getElementById("pub-filter-label");
    if (!label) return;
    if (!activeKeywords.length) {
      label.textContent = "Filtering by: Show all";
      return;
    }
    var labelText = activeKeywords.map(function (keyword) {
      if (keyword === SELECTED_FILTER) return "Selected";
      return keyword === FIRST_AUTHOR_FILTER ? "First-author" : keyword;
    }).join(" + ");
    label.textContent = "Filtering by: " + labelText;
  }

  function makeKeyword(keyword) {
    var text = keyword === "all" ? "Show all" : keyword;
    if (keyword === FIRST_AUTHOR_FILTER) text = "First-author";
    if (keyword === SELECTED_FILTER) text = "Selected";
    var isActive = keyword === "all" ? !activeKeywords.length : activeKeywords.indexOf(keyword) !== -1;
    var isColored = keyword !== "all" && keyword !== FIRST_AUTHOR_FILTER && keyword !== SELECTED_FILTER;
    var b = el("button", "keyword-btn" + (isColored ? " keyword-colored" : "") + (isActive ? " active" : ""), text);
    b.type = "button";
    if (isColored) applyKeywordColor(b, keyword);
    b.addEventListener("click", function () {
      if (keyword === "all") {
        activeKeywords = [];
      } else {
        activeKeywords = [keyword];
      }
      buildKeywordFilters();
      updateFilterLabel();
      renderPapers();
    });
    return b;
  }

  function buildKeywordFilters() {
    var keywordWrap = document.getElementById("keyword-filters");
    var viewWrap = document.getElementById("pub-view-filters");
    if (keywordWrap) keywordWrap.innerHTML = "";
    if (viewWrap) viewWrap.innerHTML = "";
    var seen = {};
    allPapers.forEach(function (p) {
      (p.keywords || []).forEach(function (k) {
        if (!FILTER_HIDDEN_KEYWORDS[k]) seen[k] = true;
      });
    });
    var viewTarget = viewWrap || keywordWrap;
    if (viewTarget) {
      viewTarget.appendChild(makeKeyword("all"));
      viewTarget.appendChild(makeKeyword(SELECTED_FILTER));
      viewTarget.appendChild(makeKeyword(FIRST_AUTHOR_FILTER));
    }
    if (keywordWrap) {
      sortKeywords(Object.keys(seen)).forEach(function (k) { keywordWrap.appendChild(makeKeyword(k)); });
    }
  }

  function makePubItem(p) {
    var li = el("li", "pub-item");
    li.appendChild(makeThumb(p, "pub"));

    var body = el("div", "pub-body");
    var metaParts = [];
    if (p.venue) metaParts.push(p.venue);
    if (p.venueNote) metaParts.push(p.venueNote);
    if (!p.hideYear && p.year) metaParts.push(p.year);
    var metaText = metaParts.join(" · ");
    var meta = el("div", "pub-meta", metaText);
    if (String(p.venue || "").toLowerCase() === "under review") {
      meta.className += " pub-meta-under-review";
    }
    if (p.note) {
      meta.appendChild(document.createTextNode(" "));
      meta.appendChild(el("span", "pub-note", p.note));
    }
    body.appendChild(meta);

    var title = el("h3", "pub-title", p.title);
    body.appendChild(title);
    body.appendChild(renderAuthors(p.authors));

    var tags = el("div", "tag-list");
    sortKeywords(p.keywords).forEach(function (k) { tags.appendChild(makeTag(k)); });
    body.appendChild(tags);

    var pubLinks = renderLinks(p.links);
    if (pubLinks.childNodes.length) body.appendChild(pubLinks);
    li.appendChild(body);
    return li;
  }

  function renderPapers() {
    var list = document.getElementById("pub-list");
    if (!list) return;
    list.innerHTML = "";
    var filtered = allPapers.filter(paperMatches);
    if (!filtered.length) {
      list.appendChild(el("li", "empty", "No publications match your filter."));
      return;
    }
    filtered.forEach(function (p) { list.appendChild(makePubItem(p)); });
  }

  var searchInput = document.getElementById("pub-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value.trim().toLowerCase();
      renderPapers();
    });
  }

  function makeProjectItem(project) {
    var isOther = String(project.category || "").toLowerCase() !== "research";
    var item = el("article", "project-item" + (isOther ? " project-other" : ""));
    if (!isOther) item.appendChild(makeThumb(project, "project"));

    var body = el("div", "project-body");
    body.appendChild(el("div", "project-category", project.category || "Project"));
    body.appendChild(el("h3", "project-title", project.title));
    body.appendChild(el("p", "project-desc", project.description));

    if (project.details && project.details.length) {
      var details = el("ul", "project-details");
      project.details.forEach(function (d) {
        var li = el("li");
        appendLinkedText(li, d, project.detailLinks);
        details.appendChild(li);
      });
      body.appendChild(details);
    }

    var tags = el("div", "tag-list");
    sortKeywords(project.keywords).forEach(function (k) { tags.appendChild(makeTag(k)); });
    body.appendChild(tags);
    var projectLinks = renderLinks(project.links);
    if (projectLinks.childNodes.length) body.appendChild(projectLinks);
    item.appendChild(body);
    return item;
  }

  function renderProjects(projects) {
    var list = document.getElementById("project-list");
    if (!list) return;
    list.innerHTML = "";
    if (!projects || !projects.length) {
      list.appendChild(el("div", "empty", "No projects yet."));
      return;
    }
    var research = [];
    var other = [];
    projects.forEach(function (project) {
      if (String(project.category || "").toLowerCase() === "research") research.push(project);
      else other.push(project);
    });
    research.forEach(function (project) { list.appendChild(makeProjectItem(project)); });

    if (other.length) {
      var otherWrap = el("div", "project-other-list");
      otherWrap.hidden = true;
      other.forEach(function (project) { otherWrap.appendChild(makeProjectItem(project)); });

      var btn = el("button", "project-toggle", "+ Show other projects (" + other.length + ")");
      btn.type = "button";
      btn.addEventListener("click", function () {
        otherWrap.hidden = !otherWrap.hidden;
        btn.textContent = otherWrap.hidden ? "+ Show other projects (" + other.length + ")" : "- Hide other projects";
      });
      list.appendChild(btn);
      list.appendChild(otherWrap);
    }
  }

  if (document.getElementById("news-list")) {
    fetchJSON("data/news.json")
      .then(renderNews)
      .catch(function (err) {
        var list = document.getElementById("news-list");
        if (list) {
          list.innerHTML = "";
          list.appendChild(el("li", "error", "Could not load news: " + err.message));
        }
      });
  }

  if (document.getElementById("pub-list")) {
    fetchJSON("data/papers.json")
      .then(function (papers) {
        allPapers = (papers || []).slice().sort(function (a, b) {
          return (b.year || 0) - (a.year || 0);
        });
        buildKeywordFilters();
        updateFilterLabel();
        renderPapers();
      })
      .catch(function (err) {
        var list = document.getElementById("pub-list");
        if (list) {
          list.innerHTML = "";
          list.appendChild(el("li", "error", "Could not load publications: " + err.message));
        }
      });
  }

  if (document.getElementById("project-list")) {
    fetchJSON("data/projects.json")
      .then(renderProjects)
      .catch(function (err) {
        var list = document.getElementById("project-list");
        if (list) {
          list.innerHTML = "";
          list.appendChild(el("div", "error", "Could not load projects: " + err.message));
        }
      });
  }
})();
