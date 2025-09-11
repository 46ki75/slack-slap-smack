const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const MESSAGES: readonly string[] = Object.freeze([
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
  "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
  "It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
  "It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
]);

async function* greet(): AsyncIterableIterator<string> {
  for (const message of MESSAGES) {
    await sleep(1000);
    yield message;
  }
}

export const handler = async (event: { responseUrl: string }): Promise<{}> => {
  for await (const message of greet()) {
    // chat:write.public
    const response = await fetch(event.responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        text: message,
      }),
    });

    if (!response.ok) void console.error(response.status);
    if (!response.ok) void console.error(response.body);
  }

  return {};
};
