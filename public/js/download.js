document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/event/info");
    if (!response.ok) throw new Error("Failed to load event info");

    const data = await response.json();

    // If no event is configured, show error
    if (!data) {
      throw new Error(
        "No birthday event has been configured yet. Please ask the organizer to set up the event.",
      );
    }

    // Populate hero section
    document.getElementById("event-name").textContent =
      data.event_name || "Birthday Celebration";
    document.getElementById("event-venue").textContent = data.venue || "";
    if (data.start_time) {
      const date = new Date(data.start_time);
      document.getElementById("event-date").textContent =
        date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }) +
        " at " +
        date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
    }

    // PDF viewer state (inline) + download button
    const pdfViewerContainer = document.getElementById("pdf-viewer-container");
    const pdfCanvasViewer = document.getElementById("pdf-canvas-viewer");
    const pdfCanvasContainer = document.getElementById("pdf-canvas-container");
    const pdfLoading = document.getElementById("pdf-loading");
    const downloadBtn = document.getElementById("download-pdf-btn");
    const noPdfMsg = document.getElementById("no-pdf-msg");
    const pageIndicator = document.getElementById("pdf-page-indicator");
    const pageCounterText = document.getElementById("page-counter-text");
    const progressFill = document.getElementById("pdf-progress-fill");

    let pdfDoc = null;
    let isRendering = false;

    async function renderPdf(base64Pdf) {
      if (isRendering) return;
      isRendering = true;
      try {
        if (!window.pdfjsLib) {
          throw new Error("PDF.js library not loaded");
        }

        // Configure PDF.js worker locally using absolute root path
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.js";

        // Convert base64 to binary Uint8Array
        const rawBase64 = base64Pdf.replace(
          /^data:application\/pdf;base64,/,
          "",
        );
        const pdfData = atob(rawBase64);
        const pdfBytes = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
          pdfBytes[i] = pdfData.charCodeAt(i);
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: pdfBytes });
        pdfDoc = await loadingTask.promise;

        // Show page indicator with total pages
        if (pageIndicator) pageIndicator.style.display = "flex";
        if (pageCounterText) {
          pageCounterText.textContent = "Page 1 of " + pdfDoc.numPages;
        }

        await renderPages();

        // Hide loading, show canvas container
        pdfLoading.style.display = "none";
        pdfCanvasContainer.style.display = "flex";

        // Update progress bar on scroll
        if (pdfCanvasContainer && progressFill) {
          pdfCanvasContainer.addEventListener("scroll", function () {
            const scrollTop = this.scrollTop;
            const scrollHeight = this.scrollHeight - this.clientHeight;
            const progress =
              scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressFill.style.width = Math.min(progress, 100) + "%";

            // Update page counter based on which page is most visible
            if (pdfDoc) {
              const canvases = this.querySelectorAll("canvas");
              let currentPage = 1;
              let maxVisible = 0;
              const containerRect = this.getBoundingClientRect();
              canvases.forEach(function (canvas, idx) {
                const rect = canvas.getBoundingClientRect();
                const visible = Math.max(
                  0,
                  Math.min(rect.bottom, containerRect.bottom) -
                    Math.max(rect.top, containerRect.top),
                );
                if (visible > maxVisible) {
                  maxVisible = visible;
                  currentPage = idx + 1;
                }
              });
              if (pageCounterText) {
                pageCounterText.textContent =
                  "Page " + currentPage + " of " + pdfDoc.numPages;
              }
            }
          });
        }
      } catch (err) {
        console.error("PDF.js rendering failed:", err);
        if (pdfCanvasViewer) pdfCanvasViewer.style.display = "none";

        var title = "Inline Viewer Unavailable";
        var message =
          "Your browser or connection does not support inline PDF canvas compilation.";
        var isMock = false;

        if (!window.pdfjsLib) {
          title = "Viewer Offline";
          message =
            "The PDF rendering library could not be loaded. Please ensure you are connected to the network.";
        } else if (
          err.name === "FormatError" ||
          err.message.includes("PDF header") ||
          err.message.includes("FormatError") ||
          base64Pdf.length < 200
        ) {
          title = "Invalid PDF Data (Mock)";
          message =
            "The database contains a mock or incomplete PDF string (e.g. from tests) rather than a compiled PDF document. Once you upload a real, valid PDF file in the admin panel, the program will render beautifully inline!";
          isMock = true;
        }

        const fallbackContainer = document.createElement("div");
        fallbackContainer.className = "pdf-fallback-container glass-panel";
        fallbackContainer.style.textAlign = "center";
        fallbackContainer.style.padding = "28px 20px";
        fallbackContainer.style.margin = "16px 0";
        fallbackContainer.innerHTML = [
          '<div style="font-size: 2.2rem; margin-bottom: 12px;">' +
            (isMock ? "&#x1F4DD;" : "&#x26A0;&#xFE0F;") +
            "</div>",
          '<h3 style="font-size: 1.05rem; margin-bottom: 6px; color: #fff; font-weight: 700;">' +
            title +
            "</h3>",
          '<p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">' +
            message +
            "</p>",
          '<div style="background: rgba(0, 0, 0, 0.35); padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 0.75rem; color: #f43f5e; text-align: left; overflow-x: auto; margin-bottom: 16px; border: 1px solid rgba(244, 63, 94, 0.15);">',
          "<strong>Diagnostic error:</strong> " +
            escapeHTML(err.message || err.toString()) +
            "</div>",
          '<p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">',
          'Tap the <strong>"Download Birthday Program PDF"</strong> button below to open the file directly.</p>',
        ].join("");
        pdfViewerContainer.appendChild(fallbackContainer);
      } finally {
        isRendering = false;
      }
    }

    async function renderPages() {
      if (!pdfDoc) return;
      pdfCanvasContainer.innerHTML = ""; // Clear previous render

      const containerWidth = pdfCanvasContainer.clientWidth || 350;

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        const canvas = document.createElement("canvas");
        canvas.className = "pdf-page-canvas";
        pdfCanvasContainer.appendChild(canvas);

        const context = canvas.getContext("2d");
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Retina scaling of 1.5x for crisp text rendering on mobile devices
        const scale = (containerWidth / unscaledViewport.width) * 1.5;
        const viewport = page.getViewport({ scale: scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }
    }

    // Debounced window resize/orientation-change handler to re-render pages nicely
    let resizeTimeout;
    window.addEventListener("resize", () => {
      if (!pdfDoc) return;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        renderPages().catch((err) =>
          console.error("Error re-rendering PDF pages on resize:", err),
        );
      }, 250);
    });

    if (data.program_pdf) {
      pdfViewerContainer.style.display = "block";
      downloadBtn.style.display = "inline-flex";
      noPdfMsg.style.display = "none";

      // Attempt PDF.js rendering
      renderPdf(data.program_pdf);
    } else {
      pdfViewerContainer.style.display = "none";
      if (pdfCanvasContainer) pdfCanvasContainer.innerHTML = "";
      downloadBtn.style.display = "none";
      noPdfMsg.style.display = "block";
    }

    // Celebrant marquee carousel
    const celebrants = data.celebrants || [];
    const celebSection = document.getElementById("celebrant-section");
    const carouselTrack = document.getElementById("celebrant-carousel-track");
    const celebDots = document.getElementById("celebrant-dots");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");
    if (celebrants.length > 0) {
      celebSection.classList.remove("download-section-hidden");

      // Build slides
      carouselTrack.innerHTML = celebrants
        .map(function (c, idx) {
          var slide = '<div class="celebrant-carousel-slide">';
          slide += '<div class="celebrant-frame">';
          if (c.photo) {
            slide +=
              '<img src="' +
              escapeHTML(c.photo) +
              '" alt="' +
              escapeHTML(c.name) +
              '" class="celebrant-frame-photo">';
          } else {
            slide +=
              '<div class="celebrant-frame-placeholder">&#x1F381;</div>';
          }
          // Crown badge on first celebrant (birthday person)
          if (idx === 0) {
            slide +=
              '<div class="celebrant-crown"><svg viewBox="0 0 24 24" fill="#0F0A0A" stroke="none"><path d="M2 19h20v3H2v-3zM3.3 7.5l3.7 3.7L12 2l5 9.2 3.7-3.7L22 16H2l1.3-8.5z"/></svg></div>';
          }
          slide += "</div>";
          slide +=
            '<div class="celebrant-slide-name">' +
            escapeHTML(c.name) +
            "</div>";
          if (c.role) {
            slide +=
              '<div class="celebrant-slide-role">' +
              escapeHTML(c.role) +
              "</div>";
          }
          slide += "</div>";
          return slide;
        })
        .join("");

      // Page dots
      if (celebrants.length > 1) {
        celebDots.innerHTML = celebrants
          .map(function (_, idx) {
            return (
              '<button class="celebrant-dot' +
              (idx === 0 ? " active" : "") +
              '" data-index="' +
              idx +
              '"></button>'
            );
          })
          .join("");
      }

      // Carousel state
      var currentIndex = 0;
      var totalSlides = celebrants.length;

      function goToSlide(idx) {
        if (idx < 0) idx = 0;
        if (idx >= totalSlides) idx = totalSlides - 1;
        currentIndex = idx;
        carouselTrack.style.transform =
          "translateX(-" + (currentIndex * 100) + "%)";
        // Update dots
        var dots = celebDots.querySelectorAll(".celebrant-dot");
        dots.forEach(function (d, i) {
          if (i === currentIndex) {
            d.classList.add("active");
          } else {
            d.classList.remove("active");
          }
        });
      }

      // Nav buttons
      if (prevBtn && nextBtn) {
        prevBtn.style.display = totalSlides > 1 ? "flex" : "none";
        nextBtn.style.display = totalSlides > 1 ? "flex" : "none";

        prevBtn.onclick = function () {
          goToSlide(currentIndex - 1);
        };
        nextBtn.onclick = function () {
          goToSlide(currentIndex + 1);
        };
      }

      // Dot clicks
      celebDots.addEventListener("click", function (e) {
        var dot = e.target.closest(".celebrant-dot");
        if (dot) {
          goToSlide(parseInt(dot.getAttribute("data-index"), 10));
        }
      });

      // Touch/swipe support
      var touchStartX = 0;
      var touchEndX = 0;
      carouselTrack.addEventListener(
        "touchstart",
        function (e) {
          touchStartX = e.changedTouches[0].screenX;
        },
        { passive: true },
      );
      carouselTrack.addEventListener(
        "touchend",
        function (e) {
          touchEndX = e.changedTouches[0].screenX;
          var diff = touchStartX - touchEndX;
          if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < totalSlides - 1) {
              goToSlide(currentIndex + 1);
            } else if (diff < 0 && currentIndex > 0) {
              goToSlide(currentIndex - 1);
            }
          }
        },
        { passive: true },
      );

      // Auto-scroll every 5 seconds
      var autoScroll = setInterval(function () {
        var next = (currentIndex + 1) % totalSlides;
        goToSlide(next);
      }, 5000);

      // Pause auto-scroll on hover/touch
      carouselTrack.addEventListener("mouseenter", function () {
        clearInterval(autoScroll);
      });
      carouselTrack.addEventListener("mouseleave", function () {
        autoScroll = setInterval(function () {
          var next = (currentIndex + 1) % totalSlides;
          goToSlide(next);
        }, 5000);
      });
      carouselTrack.addEventListener("touchstart", function () {
        clearInterval(autoScroll);
      });
    }

    // Schedule timeline
    const schedule = data.schedule || [];
    const schedSection = document.getElementById("schedule-section");
    const schedTimeline = document.getElementById("schedule-timeline");
    if (schedule.length > 0) {
      schedSection.classList.remove("download-section-hidden");
      schedTimeline.innerHTML = schedule
        .map(function (s, idx) {
          var classes = "schedule-item";
          // First item gets featured treatment
          if (idx === 0) classes += " featured";
          var html = '<div class="' + classes + '">';
          html += '<div class="time">' + escapeHTML(s.time) + "</div>";
          html += '<div class="title">' + escapeHTML(s.title) + "</div>";
          if (s.description) {
            html += '<div class="desc">' + escapeHTML(s.description) + "</div>";
          }
          if (idx === 0) {
            html += '<div class="schedule-featured-divider">';
            html += '<span class="schedule-featured-divider-line"></span>';
            html += '<span class="schedule-featured-divider-diamond"></span>';
            html += '<span class="schedule-featured-divider-line"></span>';
            html += "</div>";
            html +=
              '<div class="featured-quote">&#x2726; The main event &#x2726;</div>';
          }
          html += "</div>";
          return html;
        })
        .join("");
    }

    // Show card, hide loading
    document.getElementById("loading-state").style.display = "none";
    document.getElementById("download-card").style.display = "block";
  } catch (err) {
    console.error(err);
    document.getElementById("loading-state").style.display = "none";
    const errorContainer = document.getElementById("error-container");
    var errorTextEl = document.getElementById("error-text");
    if (errorTextEl) {
      errorTextEl.textContent =
        err.message || "Could not load the birthday program information.";
    }
    if (errorContainer) {
      errorContainer.style.display = "block";
    }
  }
});

// Wire up retry button
document.addEventListener("DOMContentLoaded", function () {
  var retryBtn = document.getElementById("retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      location.reload();
    });
  }
});

function downloadPdf() {
  // Open the download endpoint in a new tab (triggers browser download)
  window.open("/api/event/download", "_blank");
}

function escapeHTML(str) {
  if (!str) return "";
  var a = String.fromCharCode(38);
  var q = String.fromCharCode(34);
  var l = String.fromCharCode(60);
  var g = String.fromCharCode(62);
  var s = String.fromCharCode(39);
  var m = {};
  m[a] = a + "amp;";
  m[l] = a + "lt;";
  m[g] = a + "gt;";
  m[s] = a + "#39;";
  m[q] = a + "quot;";
  return str.replace(/[&<>"']/g, function (t) {
    return m[t.charCodeAt(0)] || t;
  });
}
