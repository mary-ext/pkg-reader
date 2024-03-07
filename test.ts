import { assertEquals } from 'jsr:@std/assert';

import { createIterableReader, createUint8Reader } from './mod.ts';

Deno.test(`can stream sample text file`, async () => {
	const expected = await Deno.readFile(`samples/pg19033.txt`);

	using fd = await Deno.open(`samples/pg19033.txt`);

	const stat = await fd.stat();

	const reader = createIterableReader(fd.readable);

	const actual = new Uint8Array(stat.size);
	await reader.read(actual);

	assertEquals(actual, expected);
});

Deno.test(`can read sample text file`, async () => {
	const expected = await Deno.readFile(`samples/pg19033.txt`);
	const reader = createUint8Reader(expected);

	const actual = new Uint8Array(expected.byteLength);
	await reader.read(actual);

	assertEquals(actual, expected);
});
