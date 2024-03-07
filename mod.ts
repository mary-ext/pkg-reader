const EMPTY_BUFFER = new Uint8Array(0);

/**
 * Provides the ability to read variably-sized buffers
 */
export interface Reader {
	/**
	 * Reads up to `p.byteLength` into `p`
	 */
	read(p: Uint8Array): Promise<number | null>;
	/**
	 * Skip reading `n` amount of bytes
	 */
	seek(n: number): Promise<number>;
}

/**
 * Creates a reader from a Uint8Array async iterable
 */
export function createIterableReader(iterable: AsyncIterable<Uint8Array>): Reader {
	const iterator = iterable[Symbol.asyncIterator]();

	let pages: Uint8Array[] = [];
	let buffer = EMPTY_BUFFER;

	let ptr = 0;
	let size = 0;
	let read = 0;

	return {
		async read(p: Uint8Array): Promise<number | null> {
			while (size < p.byteLength) {
				const result = await iterator.next();

				if (result.done) {
					break;
				}

				const chunk = result.value;
				const length = chunk.byteLength;

				size += length;
				read += length;

				pages.push(chunk);
			}

			if (size < 1) {
				pages = [];
				buffer = new Uint8Array(0);
				return null;
			}

			let unwritten = p.byteLength;

			while (unwritten > 0) {
				const remaining = buffer.byteLength - ptr;
				const length = Math.min(unwritten, remaining);

				p.set(buffer.subarray(ptr, ptr + length), p.byteLength - unwritten);

				ptr += length;
				unwritten -= length;
				size -= length;

				if (ptr >= buffer.byteLength) {
					if (pages.length < 1) {
						break;
					}

					buffer = pages.shift()!;
					ptr = 0;
				}
			}

			return p.byteLength - unwritten;
		},
		async seek(n: number): Promise<number> {
			while (size < n) {
				const result = await iterator.next();

				if (result.done) {
					break;
				}

				const chunk = result.value;
				const length = chunk.byteLength;

				size += length;
				read += length;

				pages.push(chunk);
			}

			ptr += n;
			size -= n;
			read += n;

			while (ptr >= buffer.byteLength && pages.length > 0) {
				ptr -= buffer.byteLength;
				buffer = pages.shift()!;
			}

			return read;
		},
	};
}

/**
 * Creates a reader from a Uint8Array
 */
export function createUint8Reader(uint8: Uint8Array): Reader {
	const size = uint8.length;
	let read = 0;

	return {
		// deno-lint-ignore require-await
		async read(p) {
			const remaining = size - read;

			if (remaining <= 0) {
				return null;
			}

			if (p.byteLength <= remaining) {
				p.set(uint8.subarray(read, read += p.byteLength));
				return p.byteLength;
			}

			p.set(uint8.subarray(read, read += remaining));
			return remaining;
		},
		// deno-lint-ignore require-await
		async seek(n) {
			const remaining = size - read;
			read += n <= remaining ? n : remaining;

			return read;
		},
	};
}

/**
 * Creates an async iterable from a ReadableStream
 */
export async function* createStreamIterable<T>(
	stream: ReadableStream<T>,
): AsyncGenerator<Awaited<T>, void, unknown> {
	const reader = stream.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				return;
			}

			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}
