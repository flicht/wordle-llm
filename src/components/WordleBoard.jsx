export default function WordleBoard({ guesses, feedback, title, reasonList, maskFeedback }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow min-w-[300px]">
      <h2 className="text-lg font-bold mb-2 text-gray-600">{title}</h2>
      <div className="flex flex-col gap-1">
        {guesses.map((guess, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {[...guess.padEnd(5)].map((char, j) => {
              let code = feedback[idx]?.[j];
              if (maskFeedback) code = null;
              let tileClass =
                code === "g"
                  ? "bg-green-400"
                  : code === "y"
                  ? "bg-yellow-400"
                  : code === "b"
                  ? "bg-gray-200"
                  : "bg-gray-100";
              return (
                <div
                  key={j}
                  className={`w-8 h-8 rounded text-center font-mono font-bold text-xl border ${tileClass} text-gray-600 flex items-center justify-center`}
                >
                  {title === 'You' ? char : ""}
                </div>
              );
            })}
            {reasonList && reasonList[idx] && (
              <span className="ml-2 text-xs text-gray-600">{reasonList[idx]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}