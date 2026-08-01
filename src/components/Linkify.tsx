const SPLIT_REGEX = /(https?:\/\/[^\s]+)/g;
const URL_TEST_REGEX = /^https?:\/\/[^\s]+$/;

export default function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(SPLIT_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_TEST_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline ${className ?? ""}`}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}
