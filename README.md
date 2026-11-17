## How to run
Make sure you have Node.js and npm installed. npm should come installed with Node.js

After cloning the repo, run:

```npm ci```

This installs all the dependencies needed to run the project. You only need to do this once after cloning.

we are using vite, it's just basically an easy way to let us run our website locally, and it automatically updates the browser when we make changes to the code.

To see the website, run:

```npm run dev```

You should see something like:

```
VITE v8.3.4  ready in 136 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
  ```

  Just ctrl + click the localhost link, and the website should open in your browser.

## Standalone Evolution Quiz (US9)

Run `npm ci` after pulling dependency changes, then `npm run dev` and open
**http://localhost:5173/quiz.html**. This plays the real question set without
starting a simulation. Start, Submit, Next, results, retry, and exit confirmation
are connected. Back or Done shows a closed screen; Open quiz starts a fresh instance.

To check the production build, run `npm run build`, then `npm run preview` and
open **http://localhost:4173/quiz.html**. Both the main game and quiz pages are
included in the build. The fixture preview remains at `/dev/quiz/` during development.

For future main-game integration, import `startQuizSession` from
`src/minigames/quiz/startQuizSession.ts` and pass a visible, attached HTML container:

```ts
const quiz = startQuizSession(container, {
  onExit: () => showPreviousScreen(),
  onComplete: result => console.log(result.correct, result.total), // optional
});
// When the host removes the quiz without Back/Done:
quiz.dispose();
```

The setup function mounts only its own elements and returns idempotent cleanup.
It defaults to the production questions; an optional `questions` array supports
other valid content lengths. Completion fires once after final feedback for each
completed attempt. Leave quiz returns to the introduction without closing the host.
The standalone HTML is only a launch shell; its markup does not need to be copied
into the main game's `index.html`.

The quiz views guard their own lifecycle edge cases: copied redraws keep Next,
Try again, and Done locked; redraws keep focus on the heading; replaced, hidden, or
modal-blocked controls do nothing; and the exit dialog acts only while open. Real-DOM
checks for these run in the browser at **http://localhost:5173/dev/quiz/lifecycle.html**
(Vitest runs without a DOM). The page lists each check and should show all passing.
