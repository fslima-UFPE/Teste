document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById("topics-toggle");
  if (!btn) return;

  btn.addEventListener("click", function() {
    document.body.classList.toggle("sidebar-open");
  });
});
