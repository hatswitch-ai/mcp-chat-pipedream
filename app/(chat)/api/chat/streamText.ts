import { generateUUID, getTrailingMessageId } from "@/lib/utils"
import {
  streamText as _streamText,
  appendResponseMessages,
  DataStreamWriter,
  ToolSet,
  UIMessage,
  Message,
  smoothStream,
} from "ai"

export const streamText = async (
  {
    dataStream,
    userMessage,
  }: { dataStream: DataStreamWriter; userMessage: UIMessage },
  args: Omit<Parameters<typeof _streamText>[0], "tools"> & {
    getTools: () => Promise<ToolSet>
  }
) => {
  const {
    maxSteps = 1,
    maxRetries,
    messages: _messages,
    getTools,
    ...rest
  } = args
  // Convert UI messages to proper Message objects with IDs if needed
  let messages = (_messages ?? []).map((msg) =>
    "id" in msg ? msg : { ...msg, id: generateUUID() }
  ) as Message[]

  for (let steps = 0; steps < maxSteps; steps++) {
    const cont = await new Promise<boolean>(async (resolve, reject) => {
      const tools = await getTools()
      console.log(">> Using tools", Object.keys(tools).join(", "))
      const result = _streamText({
        ...rest,
        messages,
        tools,
        experimental_transform: [
          smoothStream({
            chunking: /\s*\S+\s*/m,
            delayInMs: 0
          })
        ],
        onFinish: async (event) => {
          console.log(">> Finish reason", event.finishReason)

          switch (event.finishReason) {
            case "stop":
            case "content-filter":
              resolve(false)
              break
            case "error":
              // On error, still try to append messages and stop the loop
              console.log(">> Error occurred, stopping execution")
              try {
                if (event.response.messages.length > 0) {
                  messages = appendResponseMessages({
                    messages,
                    responseMessages: event.response.messages,
                  })
                }
                await rest.onFinish?.(event)
              } catch (e) {
                console.error("Error in onFinish handler:", e)
              }
              resolve(false)
              break
            case "length":
            case "tool-calls":
            case "other":
            case "unknown":
            default:
              break
          }

          const assistantId = getTrailingMessageId({
            messages: event.response.messages.filter(
              (message) => message.role === "assistant"
            ),
          })

          if (!assistantId) {
            console.error("No assistant message found in response messages:", event.response.messages)
            // Instead of throwing, just stop the loop
            resolve(false)
            return
          }

          messages = appendResponseMessages({
            messages,
            responseMessages: event.response.messages,
          })
          await rest.onFinish?.(event)
          resolve(true)
        },
      })

      result.consumeStream()

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      })
    })

    if (!cont) {
      console.log("Ending loop", steps)
      break
    }
  }
}
