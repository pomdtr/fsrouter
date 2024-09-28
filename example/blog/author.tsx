/** @jsxImportSource npm:preact */
import { render } from "npm:preact-render-to-string"

function App() {
  return (
    <html>
      <head>
        <title>Hello from JSX</title>
      </head>
      <body>
        <h1>Hello from /blog/author</h1>
      </body>
    </html>
  );
}

export default (_req: Request) => {
  const html = render(<App />);

  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
};
