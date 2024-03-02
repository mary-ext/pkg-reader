# reader

Provides a Reader interface for reading variably-sized chunks of bytes.

```ts
const file = await Deno.open('example.tar');
const reader = createIterableReader(file.readable);

const chunk = new Uint8Array(512);

await reader.read(chunk);
```
