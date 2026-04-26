/* ═══════════════════════════════════════════════════════════════════════
   ENVELOPE OPENING ANIMATION
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var envWrap     = document.getElementById('env-wrap');
  var pageContent = document.getElementById('page-content');

  if (!envWrap) return;

  var opened = false;

  function openEnvelope() {
    if (opened) return;
    opened = true;

    envWrap.classList.add('open');

    // Reveal background immediately through the opening flaps
    pageContent.classList.add('bg-visible');

    // After flaps have cleared (1200ms): unlock scroll + reveal content + start names
    setTimeout(function () {
      document.documentElement.classList.add('scrollable');
      document.body.style.overflow = 'auto';

      pageContent.classList.add('content-revealed');

      // Fire the names handwriting animation (populated by the IIFE below)
      if (typeof window._startNames === 'function') {
        window._startNames();
      }
    }, 1200);
  }

  envWrap.addEventListener('click', openEnvelope);
  envWrap.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEnvelope();
    }
  });
}());


(function () {
  /* ─── ANIMATION CONFIG ─────────────────────────────────────────────────
     Edit these values to customise the handwriting animation.
  ─────────────────────────────────────────────────────────────────────── */
  var CONFIG = {
    duration:      2800,   /* ms — total time to write the full text          */
    delay:         500,      /* ms — pause before the animation starts          */
    strokeWidth:   1.8,    /* SVG units — pen-tip thickness while drawing     */
    fillFadeRatio: 1.2,   /* 0–1 — how much of each letter's time is spent
                              fading the fill in (behind the stroke). 0 = no
                              fill fade (ink appears all at once at the end),
                              1 = fill fades the whole time the letter draws. */
    gapMultiplier: 1800,    /* >1 slows pen between letters, <1 speeds up     */
  };
  /* ────────────────────────────────────────────────────────────────────── */

  var svgStage =
    document.getElementById("hero-names") ||
    document.getElementById("svg-stage");
  var replayBtn = document.getElementById("replay-btn");
  var activeSvg = null;
  var rafId = null;
  var pathData = [];

  if (!svgStage) return;

  /* Gentle ease — keeps the pen speed feeling mostly steady but with soft
     start and finish, closer to a human hand than pure linear */
  function easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function preparePaths(svgEl) {
    var paths = Array.from(svgEl.querySelectorAll("path"));
    pathData = [];

    var totalLength = 0;

    paths.forEach(function (path) {
      var len = path.getTotalLength();
      if (!len || !isFinite(len)) return;

      /* Use the <g>'s fill attribute if the path itself has none — matches
         how this SVG was exported (fill lives on the parent group) */
      var originalFill =
        path.getAttribute("fill") ||
        (path.parentNode && path.parentNode.getAttribute("fill")) ||
        (path.closest("g[fill]") && path.closest("g[fill]").getAttribute("fill")) ||
        "#223202";

      pathData.push({
        el: path,
        length: len,
        fill: originalFill,
      });

      path.setAttribute("fill", originalFill);
      path.style.fillOpacity = "0";
      path.setAttribute("stroke", originalFill);
      path.setAttribute("stroke-width", String(CONFIG.strokeWidth));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.visibility = "hidden";

      totalLength += len * CONFIG.gapMultiplier;
    });

    /* Assign each path its own time window within the overall duration,
       proportional to its length. Longer letters → more time. */
    var cursor = 0;
    pathData.forEach(function (p) {
      var slice = (p.length * CONFIG.gapMultiplier) / totalLength;
      p.startProgress = cursor;
      p.endProgress = cursor + slice;
      cursor = p.endProgress;
    });
  }

  function resetPaths() {
    pathData.forEach(function (p) {
      p.el.style.strokeDashoffset = String(p.length);
      p.el.style.fillOpacity = "0";
      p.el.style.visibility = "hidden";
    });
  }

  function playAnimation() {
    if (!activeSvg) return;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    preparePaths(activeSvg);
    resetPaths();

    var eyebrow  = document.querySelector(".hero__eyebrow");
    var location = document.querySelector(".hero__location");
    var bandDate = document.querySelector(".hero__band-date");
    if (eyebrow)  eyebrow.classList.remove("visible");
    if (location) location.classList.remove("visible");
    if (bandDate) bandDate.classList.remove("visible");

    var duration = CONFIG.duration;
    var startTime = null;
    var started = false;

    function step(timestamp) {
      if (!started) {
        if (!startTime) startTime = timestamp;
        if (timestamp - startTime < CONFIG.delay) {
          rafId = requestAnimationFrame(step);
          return;
        }
        started = true;
        startTime = timestamp;
      }

      var elapsed = timestamp - startTime;
      var overall = Math.min(elapsed / duration, 1);
      var eased = easeInOut(overall);

      pathData.forEach(function (p) {
        var local;
        if (eased <= p.startProgress) {
          local = 0;
        } else if (eased >= p.endProgress) {
          local = 1;
        } else {
          local = (eased - p.startProgress) / (p.endProgress - p.startProgress);
        }

        /* Keep paths fully invisible until the pen actually reaches them */
        if (local <= 0) {
          p.el.style.visibility = "hidden";
          return;
        }
        p.el.style.visibility = "visible";

        p.el.style.strokeDashoffset = String(p.length * (1 - local));

        /* Fill fades in during the last `fillFadeRatio` portion of the
           letter's drawing time, so the ink "flows" in behind the pen */
        var fillStart = 1 - CONFIG.fillFadeRatio;
        var fillProgress =
          local <= fillStart
            ? 0
            : Math.min((local - fillStart) / CONFIG.fillFadeRatio, 1);
        p.el.style.fillOpacity = String(fillProgress);
      });

      if (overall < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
        var eyebrow  = document.querySelector(".hero__eyebrow");
        var location = document.querySelector(".hero__location");
        var bandDate = document.querySelector(".hero__band-date");
        if (eyebrow)  eyebrow.classList.add("visible");
        if (location) location.classList.add("visible");
        if (bandDate) bandDate.classList.add("visible");
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function mountSvg(svgText) {
    svgStage.innerHTML = svgText;
    activeSvg = svgStage.querySelector("svg");

    if (!activeSvg) {
      svgStage.textContent = "SVG load failed.";
      return;
    }

    activeSvg.setAttribute("role", "img");
    activeSvg.setAttribute("aria-label", "Animated handwritten names");

    playAnimation();
  }

  // Pre-fetch the SVG so it's ready when the envelope opens
  var _cachedSvgText = null;
  var _pendingStart  = false;

  // Called by the envelope IIFE once the flaps have cleared
  window._startNames = function () {
    if (_cachedSvgText) {
      mountSvg(_cachedSvgText);
    } else {
      _pendingStart = true; // SVG still loading — mount when ready
    }
  };

  fetch("names.svg")
    .then(function (response) {
      if (!response.ok) throw new Error("Could not load names.svg");
      return response.text();
    })
    .then(function (svgText) {
      _cachedSvgText = svgText;
      if (_pendingStart) mountSvg(svgText); // envelope already opened while fetching
    })
    .catch(function () {
      svgStage.textContent =
        "Could not load names.svg — open via a local server (not file://).";
    });

  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      playAnimation();
    });
  }
})();

/* ─── Timeline: indicator + popups ───────────────────────────────────── */
(function () {
  var popupData = {
    ceremony: {
      time: "16:00",
      title: "ჯვრისწერა",
      location: "სიონის საკათედრო ტაძარი",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Sioni+Cathedral+Tbilisi",
      body: "ჩვენი დღის პირველი და ყველაზე განსაკუთრებული მომენტი - ჯვრისწერა სიონის ტაძარში. გთხოვთ, დროულად მოხვიდეთ."
    },
    arrival: {
      time: "17:00-დან",
      title: "მიღება",
      location: "ოტიუმი, კუს ტბა",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Otium+Turtle+Lake+Tbilisi",
      body: "სტუმრები დახვედრა ოტიუმში - სასიამოვნო ატმოსფეროში, მუსიკისა და სასმელების თანხლებით."
    },
    signing: {
      time: "17:30",
      title: "ხელის მოწერა",
      location: "ოტიუმი, კუს ტბა",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Otium+Turtle+Lake+Tbilisi",
      body: "ელენე და გედი ოფიციალურად დაქორწინდებიან. ეს მომენტი სამუდამოდ შეაერთებს ორ ოჯახს."
    },
    dinner: {
      time: "18:00",
      title: "ვახშამი",
      location: "ოტიუმი, კუს ტბა",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Otium+Turtle+Lake+Tbilisi",
      body: "ერთად ვიზეიმებთ ამ განსაკუთრებულ ღამეს - სუფრა, ცეკვა, სიხარული და სიყვარული."
    }
  };

  var items     = Array.from(document.querySelectorAll(".tl-item"));
  var overlay   = document.getElementById("tl-overlay");
  var closeBtn  = document.getElementById("tl-popup-close");
  var indicator = document.getElementById("tl-indicator");
  var track     = document.querySelector(".tl-track");

  if (!items.length) return;

  /* Move the golden capsule to vertically centre on the active item.
     Uses offsetTop which is measured against the nearest positioned
     ancestor (.tl-track, position: relative). */
  function moveIndicator(itemEl) {
    if (!indicator || !itemEl) return;
    var targetY = itemEl.offsetTop + itemEl.offsetHeight / 2 - 27;
    indicator.style.transform = "translateY(" + targetY + "px)";
  }

  function openPopup(key) {
    var data = popupData[key];
    if (!data || !overlay) return;
    var locLink = document.getElementById("tl-popup-location");
    document.getElementById("tl-popup-time").textContent          = data.time;
    document.getElementById("tl-popup-title").textContent         = data.title;
    document.getElementById("tl-popup-location-text").textContent = data.location;
    locLink.setAttribute("href", data.mapUrl);
    document.getElementById("tl-popup-body").textContent          = data.body;
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closePopup() {
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  items.forEach(function (item) {
    item.addEventListener("click", function () {
      var wasActive = item.classList.contains("active");
      items.forEach(function (i) { i.classList.remove("active"); });

      if (!wasActive) {
        item.classList.add("active");
        moveIndicator(item);
        openPopup(item.dataset.popup);
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closePopup);

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closePopup();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePopup();
  });

  /* Initialise indicator on first item after layout settles */
  setTimeout(function () {
    if (items[0]) {
      items[0].classList.add("active");
      moveIndicator(items[0]);
    }
  }, 120);
})();

/* ─── RSVP form ───────────────────────────────────────────────────────── */
(function () {
  var API_URL    = "https://weddsites-backend.vercel.app/api/rsvp";
  var PROJECT_ID = "elene-gela-2026";

  var form           = document.getElementById("rsvp-form");
  var submitBtn      = document.getElementById("rsvp-submit");
  var statusEl       = document.getElementById("rsvp-status");
  var thankyou       = document.getElementById("rsvp-thankyou");
  var guestsFieldset = document.getElementById("rsvp-guests-fieldset");

  if (!form) return;

  /* Show/hide guest count depending on attendance choice */
  var attendanceRadios = form.querySelectorAll("input[name='attendance']");
  attendanceRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (radio.value === "no") {
        guestsFieldset.classList.add("hidden");
      } else {
        guestsFieldset.classList.remove("hidden");
      }
    });
  });

  async function submitRsvp(payload) {
    var requestBody = {
      projectId:  PROJECT_ID,
      name:       payload.name,
      surname:    payload.surname || "",
      attendance: payload.attendance,
      guestCount: (payload.guestCount === undefined || payload.guestCount === "")
        ? undefined
        : Number(payload.guestCount)
    };

    var response = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(requestBody)
    });

    var result = await response.json();
    if (!response.ok) throw new Error(result.error || "RSVP submit failed");
    return result;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var name       = document.getElementById("rsvp-name").value.trim();
    var surname    = document.getElementById("rsvp-surname").value.trim();
    var attendance = form.querySelector("input[name='attendance']:checked");
    var guestCount = document.getElementById("rsvp-guest-count");

    if (!name) {
      statusEl.textContent = "გთხოვთ, შეიყვანოთ სახელი.";
      return;
    }
    if (!attendance) {
      statusEl.textContent = "გთხოვთ, აირჩიოთ პასუხი.";
      return;
    }

    submitBtn.disabled   = true;
    statusEl.textContent = "იგზავნება...";

    try {
      await submitRsvp({
        name:       name,
        surname:    surname,
        attendance: attendance.value,
        guestCount: (guestCount && guestCount.value !== "") ? guestCount.value : undefined
      });

      form.setAttribute("aria-hidden", "true");
      form.style.display = "none";
      thankyou.setAttribute("aria-hidden", "false");
      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = "დაფიქსირდა შეცდომა. გთხოვთ, სცადოთ თავიდან.";
      submitBtn.disabled = false;
      console.error(err);
    }
  });
})();
