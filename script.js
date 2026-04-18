const chat = document.getElementById("chat");
const input = document.getElementById("input");
const historyList = document.getElementById("historyList");
const servingsSelect = document.getElementById("servings");
const languageSelect = document.getElementById("languageSelect");

/* PUT YOUR GROQ API KEY HERE */
const API_KEY = "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";

let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let selectedVoice = null;
let latestRecipeText = "";

/* LOAD VOICES */
function loadVoices() {
  const voices = window.speechSynthesis.getVoices();

  selectedVoice = voices.find(voice =>
    voice.name.toLowerCase().includes("female") ||
    voice.name.toLowerCase().includes("zira") ||
    voice.name.toLowerCase().includes("samantha") ||
    voice.name.toLowerCase().includes("google uk english female")
  ) || voices[0];
}

window.speechSynthesis.onvoiceschanged = loadVoices;

/* ADD MESSAGE */
function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

/* SAVE SEARCH HISTORY */
function saveSearch(dishName) {
  if (!dishName) return;

  searchHistory.unshift(dishName);
  searchHistory = [...new Set(searchHistory)].slice(0, 10);

  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  displayHistory();
}

/* DISPLAY SEARCH HISTORY */
function displayHistory() {
  historyList.innerHTML = "";

  searchHistory.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;

    li.onclick = () => {
      input.value = item;
      sendMessage();
    };

    historyList.appendChild(li);
  });
}

/* SEND MESSAGE */
async function sendMessage(customDish = null) {
  const text = customDish || input.value.trim();

  if (!text) {
    speakText("Welcome to ChefAI X. Please choose your language and ask for any recipe you want.");
    return;
  }

  const servings = servingsSelect.value;
  const language = languageSelect.value;

  stopSpeaking();

  addMessage(text, "user");
  saveSearch(text);
  input.value = "";

  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg bot loading";
  loadingMsg.innerHTML = `
    <div class="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div>Generating recipe...</div>
  `;
  chat.appendChild(loadingMsg);

  try {
    const res = await fetch(
      "https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: `Create a realistic and culturally accurate recipe for ${text} in ${language}.

Important rules:
- Keep the recipe authentic to its cuisine
- Avoid strange ingredients
- Use realistic cooking methods
- Make ingredient quantities suitable for ${servings} people

Format the response exactly like this:

Dish Name:
[name]

Cooking Time:
[time]

Ingredients:
- item 1
- item 2

Instructions:
1. Step one
2. Step two

Tips:
- tip 1
- tip 2

Video Tutorial:
https://www.youtube.com/results?search_query=${text} recipe

Nutrition:
Calories: [value]
Protein: [value]
Carbs: [value]
Fat: [value]`
            }
          ]
        })
      }
    );

    const data = await res.json();

    let reply = "";

    if (data.choices && data.choices.length > 0) {
      reply = data.choices[0].message.content;

      reply = reply
        .replace(/Dish Name:/g, "🍽️ DISH NAME\n")
        .replace(/Cooking Time:/g, "\n⏱️ COOKING TIME\n")
        .replace(/Ingredients:/g, "\n🛒 INGREDIENTS\n")
        .replace(/Instructions:/g, "\n👨‍🍳 INSTRUCTIONS\n")
        .replace(/Tips:/g, "\n💡 TIPS\n")
        .replace(/Video Tutorial:/g, "\n🎥 VIDEO TUTORIAL\n")
        .replace(/Nutrition:/g, "\n🥗 NUTRITION\n")
        .replace(/Calories:/g, "\n🔥 CALORIES: ")
        .replace(/Protein:/g, "\n💪 Protein: ")
        .replace(/Carbs:/g, "\n🍞 Carbs: ")
        .replace(/Fat:/g, "\n🧈 Fat: ")
        .replace(/\*\*/g, "");

      loadingMsg.remove();
      addMessage(reply, "bot");

      latestRecipeText = reply;
    } else {
      loadingMsg.remove();
      addMessage("⚠️ No response from AI", "bot");
    }

  } catch (err) {
    console.log(err);
    loadingMsg.remove();
    addMessage("⚠️ Request failed", "bot");
  }
}

/* SPEAK TEXT */
function speakText(text) {
  stopSpeaking();

  const speech = new SpeechSynthesisUtterance(text);

  if (selectedVoice) {
    speech.voice = selectedVoice;
  }

  const selectedLanguage = languageSelect.value;

  if (selectedLanguage === "Hindi") {
    speech.lang = "hi-IN";
  } else if (selectedLanguage === "Bengali") {
    speech.lang = "bn-IN";
  } else if (selectedLanguage === "Spanish") {
    speech.lang = "es-ES";
  } else {
    speech.lang = "en-US";
  }

  speech.rate = 0.95;
  speech.pitch = 1.2;

  window.speechSynthesis.speak(speech);
}

/* SPEAK RECIPE */
function speakRecipe() {
  if (!latestRecipeText) {
    speakText("Please generate a recipe first.");
    return;
  }

  let cleanText = latestRecipeText;

  cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, "");
  cleanText = cleanText.replace(/🎥 VIDEO TUTORIAL[\s\S]*/g, "");

  speakText(cleanText);
}

/* STOP SPEAKING */
function stopSpeaking() {
  window.speechSynthesis.cancel();
}

/* VOICE INPUT */
function startVoice() {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.start();

  recognition.onresult = e => {
    input.value = e.results[0][0].transcript;
  };
}

/* SAVE RECIPE */
function saveRecipe() {
  localStorage.setItem("savedRecipe", chat.innerText);
  alert("Recipe saved successfully!");
}

/* SHARE RECIPE */
async function shareRecipe() {
  const text = chat.innerText;

  if (!text) {
    alert("No recipe available to share.");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "ChefAI X Recipe",
        text: text
      });
    } catch (error) {
      console.log("Sharing cancelled");
    }
  } else {
    navigator.clipboard.writeText(text);
    alert("Recipe copied to clipboard!");
  }
}

/* DOWNLOAD RECIPE */
function downloadRecipe() {
  const text = chat.innerText;

  if (!text) {
    alert("No recipe available to download.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recipe.txt";
  a.click();
}

/* ENTER KEY */
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

/* ON LOAD */
window.onload = () => {
  loadVoices();
  displayHistory();

  setTimeout(() => {
    speakText("Welcome to ChefAI X. First choose your language, then ask for any recipe you want.");
  }, 1000);
};
