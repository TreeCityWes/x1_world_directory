# tier_list_gen

A local-first website for building **tier lists**.

1. Create an **asset library** and upload images.
2. Save that library in the browser (or download a `.library.json` backup).
3. Create as many **tier lists** as you want from the same library.
4. Drag items onto S–F (or your own rows) and export a PNG.

Nothing is uploaded to a server. Libraries, images, and lists live in IndexedDB on this device.

## Run it

```bash
cd tier_list_gen
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## How it works

- **Libraries** are reusable image sets. Add, rename, or remove assets any time.
- **Lists** rank one library. New uploads to that library appear as unranked on existing boards.
- **Export PNG** snapshots the board. **Save library file** downloads a JSON backup you can import later.
