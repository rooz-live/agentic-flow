// Module: getElementById
// Confidence: 0.8
// Fragments: 7

// Module: getElementById

var protoUrl = "tg:\/\/join?invite=6RUdERX1EKo2YTRh";

var request_body = document.getElementById('tgme_frame_cont') || document.body; /* confidence: 70% */

var iframeEl = document.createElement('iframe');

var pageHidden = false;

var tme_bg = document.getElementById('tgme_background');

var darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function utility_fn(dark) {
  
  document.documentElement.classList.toggle('theme_dark', dark);
  
  window.Telegram && Telegram.setWidgetOptions({
    dark: dark
  });
  

} /* confidence: 40% */

