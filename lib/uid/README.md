# Snowflake Identifiers

This library generates unique identifiers based on the [Snowflake ID](https://en.wikipedia.org/wiki/Snowflake_ID) algorithm, encoded using Base-62 (alphanumeric only).

The output is a string with a fixed length of 11 characters.

## Features

- **Time-ordered**: IDs are roughly sorted by creation time.
- **Compact**: 64-bit ID encoded into 11 alphanumeric characters.
- **Distributed-safe**: Uses a `nodeId` to prevent collisions across different generators.
- **High throughput**: Can generate up to 4,096 IDs per millisecond per node.

## ID Structure

The 63-bit internal ID is structured as follows:
- **41 bits**: Timestamp (milliseconds since 2024-01-01)
- **10 bits**: Node ID (supports up to 1,024 nodes)
- **12 bits**: Sequence number (supports up to 4,096 IDs per ms)

## Usage

```typescript
import { make_id } from '@occupancy/uid';

// Generate an ID for node 1
const id = make_id(1);
console.log(id); // e.g. "06XpY42i7es"
```

## API

### `make_id(nodeId?: number): string`
Generates a new 11-character unique ID.
- `nodeId`: (Optional) An integer between 0 and 1023. Defaults to 0.

### `toBase62(n: bigint, length?: number): string`
Low-level utility to encode a BigInt as a Base-62 string.
- `n`: The number to encode.
- `length`: (Optional) Desired output length, padded with '0'. Defaults to 11.