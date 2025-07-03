"use client";
import { useState, useEffect, useRef } from "react";
import WordleBoard from "../components/WordleBoard";

// Helper for feedback
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

function filterPossibleWords(possibleWords, guess, feedback) {
  return possibleWords.filter(
    (word) =>
      JSON.stringify(getFeedback(guess, word)) === JSON.stringify(feedback)
  );
}

const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNM".split(""),
];

function getKeyboardState(guesses, feedbacks) {
  const state = {};
  guesses.forEach((guess, i) => {
    guess.split("").forEach((char, j) => {
      const code = feedbacks[i][j];
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
    <div className="flex flex-col items-center space-y-1 mt-4">
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} className="flex space-x-1">
          {row.map((key) => (
            <span
              key={key}
              className={`w-8 h-10 sm:w-10 sm:h-12 rounded font-bold text-lg flex items-center justify-center border ${colorClass[state[key]]}`}
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
  const [botGuesses, setBotGuesses] = useState([]);
  const [botFeedback, setBotFeedback] = useState([]);
  const [botPossibleAnswers, setBotPossibleAnswers] = useState([]);
  const [botReasons, setBotReasons] = useState([]);
  const [yourInput, setYourInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidWord, setInvalidWord] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/data/allowed.txt")
      .then((res) => res.text())
      .then((txt) => {
        setAllowedWords(
          txt.split("\n").map((w) => w.trim().toUpperCase()).filter(Boolean)
        );
      });
    fetch("/data/answers.txt")
      .then((res) => res.text())
      .then((txt) => {
        const arr = txt.split("\n").map((w) => w.trim().toUpperCase()).filter(Boolean);
        setAnswers(arr);
        setAnswer(arr[Math.floor(Math.random() * arr.length)]);
        setBotPossibleAnswers([...arr]);
        setBotGuesses([]);
        setBotFeedback([]);
        setBotReasons([]);
        if (inputRef.current) inputRef.current.focus();
      });
  }, []);

  const newGame = () => {
    setYourGuesses([]);
    setYourFeedback([]);
    setLlmGuesses([]);
    setLlmFeedback([]);
    setLlmReasons([]);
    setBotGuesses([]);
    setBotFeedback([]);
    setBotReasons([]);
    setYourInput("");
    setStatus("");
    setInvalidWord("");
    if (answers.length) {
      setAnswer(answers[Math.floor(Math.random() * answers.length)]);
      setBotPossibleAnswers([...answers]);
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
    if (inputRef.current) inputRef.current.focus();
    if (guess === answer) {
      setStatus("You win!");
    }

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

    let botGuess = "SLATE";
    let botReason = "Great starting word, covers common letters.";
    let newBotPossibleAnswers = [...botPossibleAnswers];
    if (botGuesses.length > 0) {
      newBotPossibleAnswers = filterPossibleWords(
        botPossibleAnswers,
        botGuesses[botGuesses.length - 1],
        botFeedback[botFeedback.length - 1]
      );
      if (newBotPossibleAnswers.length > 0) {
        botGuess = newBotPossibleAnswers[0];
        botReason =
          botGuesses.length === 5
            ? "Last guess!"
            : "First valid possible answer after filtering.";
      }
    }
    const botFb = getFeedback(botGuess, answer);
    setBotPossibleAnswers(
      filterPossibleWords(newBotPossibleAnswers, botGuess, botFb)
    );
    setBotGuesses((g) => [...g, botGuess]);
    setBotFeedback((f) => [...f, botFb]);
    setBotReasons((r) => [...r, botReason]);
    if (botGuess === answer && !status) setStatus("Bot wins!");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-2 py-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-600 text-center">Wordle: You vs LLM vs Bot</h1>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center">
        <WordleBoard guesses={yourGuesses} feedback={yourFeedback} title="You" status={status} />
        <WordleBoard guesses={llmGuesses} feedback={llmFeedback} title="LLM" reasonList={llmReasons} status={status} />
        <WordleBoard guesses={botGuesses} feedback={botFeedback} title="Bot" reasonList={botReasons} status={status} />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-2 items-center">
        <input
          className="border p-2 rounded font-mono uppercase text-gray-600 w-40 text-center text-xl"
          maxLength={5}
          minLength={5}
          value={yourInput}
          ref={inputRef}
          onChange={(e) => setYourInput(e.target.value.replace(/[^a-zA-Z]/g, ""))}
          disabled={status || loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-32"
          disabled={status || loading}
        >
          Guess
        </button>
      </form>

      {invalidWord && (
        <div className="mt-2 text-sm text-red-500">{invalidWord}</div>
      )}

      <Keyboard guesses={yourGuesses} feedbacks={yourFeedback} />

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