window.addEventListener("deviceorientation", (event) => {
  const x = event.gamma; // sinistra/destra
  const y = event.beta;  // su/giù

  document.querySelector(".bg").style.transform =
    `translate(${x * 0.5}px, ${y * 0.5}px)`;

  document.querySelector(".fg").style.transform =
    `translate(${x * 1.5}px, ${y * 1.5}px) scale(1.05)`;
});
