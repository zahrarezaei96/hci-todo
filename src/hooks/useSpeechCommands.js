let hoveredElement = null;

document.addEventListener('mouseover', (event) => {
  hoveredElement = event.target;
});

let recognition;
let hasStarted = false;

export function startSpeechRecognition() {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.log("Speech recognition not supported");
    return;
  }

  if (hasStarted) return;

  recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    hasStarted = true;
    console.log("Speech recognition started");
  };

  recognition.onresult = (event) => {

    const text = event.results[event.results.length - 1][0].transcript
      .toLowerCase()
      .trim();

    console.log("Heard:", text);

    if (event.results[event.results.length - 1].isFinal) {

      console.log("Final command:", text);

      // ADD

      if (text.includes("add") || text.includes("ad")) {

        console.log("ADD COMMAND DETECTED");

        const addInput = document.querySelectorAll('input')[1];

        if (addInput) {
          addInput.focus();
        }
      }

      // CLICK

      if (text.includes("click")) {

        console.log("CLICK COMMAND DETECTED");

        if (hoveredElement) {
          hoveredElement.click();
        }
      }

      // CHECK

      if (text.includes("check")) {

        console.log("CHECK COMMAND DETECTED");

        if (hoveredElement) {
          hoveredElement.click();
        }
      }

      // OPEN

      if (text.includes("open")) {

        console.log("OPEN COMMAND DETECTED");

        if (hoveredElement) {
          hoveredElement.click();
        }
      }

      // DELETE

      if (text.includes("delete")) {

        console.log("DELETE COMMAND DETECTED");

        if (hoveredElement) {
          hoveredElement.click();
        }
      }
    }
  };

  recognition.onerror = (event) => {
    console.log("Speech error:", event.error);
  };

  recognition.onend = () => {
    hasStarted = false;
    console.log("Speech recognition ended");
  };

  recognition.start();
}