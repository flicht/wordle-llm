"use client";
import { useState, useEffect } from "react";
import WordleBoard from "../components/WordleBoard";

// Helper for feedback: returns ['g','b','y',...] for green/yellow/blank
function getFeedback(guess, answer) {
  const res = Array(5).fill("b");
  const ansArr = answer.split("");
  guess.split("").forEach((c, i) => {
    if (c === ansArr[i]) {
      res[i] = "g";
      ansArr[i] = null;
    }
  });
  guess.split("").forEach((c, i) => {
    if (res[i] === "b" && ansArr.includes(c)) {
      res[i] = "y";
      ansArr[ansArr.indexOf(c)] = null;
    }
  });
  return res;
}

// Keyboard layout rows
const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNM".split(""),
];

// Used-letter coloring for keyboard
function getKeyboardState(guesses, feedbacks) {
  const state = {}; // letter: 'g' | 'y' | 'b'
  guesses.forEach((guess, i) => {
    guess.split("").forEach((char, j) => {
      const code = feedbacks[i][j];
      // Prioritize green > yellow > gray
      if (
        code === "g" ||
        (code === "y" && state[char] !== "g") ||
        (code === "b" && !state[char])
      ) {
        state[char] = code;
      }
    });
  });
  return state;
}

function Keyboard({ guesses, feedbacks }) {
  const state = getKeyboardState(guesses, feedbacks);
  const colorClass = {
    g: "bg-green-400 border-green-500 text-white",
    y: "bg-yellow-400 border-yellow-500 text-white",
    b: "bg-gray-300 border-gray-400 text-gray-600",
    "": "bg-white border-gray-300 text-gray-600",
    undefined: "bg-white border-gray-300 text-gray-600",
  };
  return (
    <div className="flex flex-col items-center space-y-1">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="flex space-x-1">
          {row.map((key) => (
            <span
              key={key}
              className={`w-8 h-10 rounded font-bold text-lg flex items-center justify-center border ${
                colorClass[state[key]]
              }`}
            >
              {key}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [allowedWords, setAllowedWords] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState("");
  const [yourGuesses, setYourGuesses] = useState([]);
  const [yourFeedback, setYourFeedback] = useState([]);
  const [llmGuesses, setLlmGuesses] = useState([]);
  const [llmFeedback, setLlmFeedback] = useState([]);
  const [llmReasons, setLlmReasons] = useState([]);
  const [yourInput, setYourInput] = useState("");
  const [status, setStatus] = useState(""); // "You win!" | "LLM wins!" | ""
  const [loading, setLoading] = useState(false);
  const [invalidWord, setInvalidWord] = useState(""); // for error message

  // Load allowed and answer word lists on mount
  useEffect(() => {
    fetch("/data/allowed.txt")
      .then((res) => res.text())
      .then((txt) => {
        setAllowedWords(
          txt
            .split("\n")
            .map((w) => w.trim().toUpperCase())
            .filter(Boolean)
        );
      });
    fetch("/data/answers.txt")
      .then((res) => res.text())
      .then((txt) => {
        const arr = txt
          .split("\n")
          .map((w) => w.trim().toUpperCase())
          .filter(Boolean);
        setAnswers(arr);
        setAnswer(arr[Math.floor(Math.random() * arr.length)]);
      });
  }, []);

  // New game resets everything and picks a new answer
  const newGame = () => {
    setYourGuesses([]);
    setYourFeedback([]);
    setLlmGuesses([]);
    setLlmFeedback([]);
    setLlmReasons([]);
    setYourInput("");
    setStatus("");
    setInvalidWord("");
    if (answers.length) {
      setAnswer(answers[Math.floor(Math.random() * answers.length)]);
    }
  };

  const isValidWord = (word) => allowedWords.includes(word.toUpperCase());

  async function handleSubmit(e) {
    e.preventDefault();
    setInvalidWord("");
    if (yourInput.length !== 5) return;
    const guess = yourInput.toUpperCase();
    if (!isValidWord(guess)) {
      setInvalidWord("Not a valid word!");
      return;
    }
    const feedback = getFeedback(guess, answer);
    setYourGuesses((g) => [...g, guess]);
    setYourFeedback((f) => [...f, feedback]);
    setYourInput("");
    if (guess === answer) {
      setStatus("You win!");
    }
    // LLM turn (always let it play even if you just won)
    setLoading(true);
    const res = await fetch("/api/llm-guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [...llmGuesses],
        feedback: [...llmFeedback],
      }),
    }).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setInvalidWord("LLM API error.");
      return;
    }
    const llmGuess = res.guess.toUpperCase();
    const llmReason = res.reason;
    const llmFb = getFeedback(llmGuess, answer);
    setLlmGuesses((g) => [...g, llmGuess]);
    setLlmFeedback((f) => [...f, llmFb]);
    setLlmReasons((r) => [...r, llmReason]);
    if (llmGuess === answer && !status) setStatus("LLM wins!");
  }

  // After the game ends, LLM's feedback is revealed.
  const revealLlmFeedback = status !== "";
  

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 text-gray-600">
        Wordle: You vs LLM
      </h1>
      <div className="flex gap-8">
        <WordleBoard
          guesses={yourGuesses}
          feedback={yourFeedback}
          title="You"
        />
        <WordleBoard
          guesses={llmGuesses}
          feedback={llmFeedback}
          title="LLM"
          reasonList={llmReasons}
        />
      </div>
      <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
        <input
          className="border p-2 rounded font-mono uppercase text-gray-600"
          maxLength={5}
          minLength={5}
          value={yourInput}
          onChange={(e) =>
            setYourInput(e.target.value.replace(/[^a-zA-Z]/g, ""))
          }
          disabled={status || loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded text-gray-600"
          disabled={status || loading}
        >
          Guess
        </button>
      </form>
      {invalidWord && (
        <div className="mt-2 text-sm text-red-500 text-gray-600">
          {invalidWord}
        </div>
      )}
      <div className="mt-8">
        <Keyboard guesses={yourGuesses} feedbacks={yourFeedback} />
      </div>
      <button
        className="mt-4 underline text-sm text-gray-600"
        onClick={newGame}
        disabled={loading}
      >
        New Game
      </button>
      {status && (
        <div className="mt-4 font-bold text-xl text-gray-600">{status}</div>
      )}
    </main>
  );
}
