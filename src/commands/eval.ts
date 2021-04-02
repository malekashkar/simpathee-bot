// @importsNotUsedAsValue: preserve
/* eslint-disable @typescript-eslint/no-unused-vars */
//? NOTE: don't remove anything unused from this file. they are here to be used from inside eval.

import Discord, { Message } from "discord.js";
import dotenv from "dotenv";
import util from "util";

import DevCommand from ".";
import config from "../config";
import embeds from "../utils/embeds";
import Logger from "../utils/logger";

dotenv.config();

class EvalCommand extends DevCommand {
  cmdName = "eval";
  description = "Evaluates any JavaScript code.";

  async run(message: Message) {
    const prefixRegex = new RegExp(`^${config.prefix}`, "i");
    const prefixMatch = message.content.match(prefixRegex);
    let content = message.content;

    if (prefixMatch && prefixMatch[0]) {
      content = content.replace(prefixRegex, "");
    }

    let code = content.trim();
    if (/^eval\n/.test(code)) {
      code = code.replace(/^eval\n/, "");
    } else if (/^eval /.test(code)) {
      code = code.replace(/^eval /, "");
    }

    if ((/^```/.test(code) || /^```js\n/.test(code)) && /```$/.test(code)) {
      code = code
        .replace(/^```/, "")
        .replace(/js(\n)?/, "")
        .replace(/```$/, "")
        .trim();
    }

    // these will be used inside eval, don't remove
    // eslint-disable-next-line
    const send = async (anything: unknown) => {
      if (anything instanceof Discord.MessageEmbed) {
        return message.channel.send(anything);
      } else if (typeof anything == "object") {
        const output = JSON.stringify(anything);
        return message.channel.send(output.slice(0, 2000));
      }
      return message.channel.send(anything.toString());
    };

    // eslint-disable-next-line
    const onError = (err: Error) => {
      Logger.error("EVAL_COMMAND", err);
      if (message && !message.deleted) message.react("❎");
      sendResult.bind(this)(err);
    };

    // eslint-disable-next-line
    const onSuccess = (result: any) => {
      if (message && !message.deleted) message.react("✅");
      sendResult.bind(this)(result);
    };
    const sendResult = (result: unknown) => {
      if (!result) return;
      if (typeof result !== "string") {
        result = util.inspect(result, false, 0);
      }
      if (typeof result === "string") {
        const embed = embeds
          .empty()
          .setDescription(
            `\`\`\`js\n${
              result.length >= 1990 ? result.slice(0, 1990) + "\n... " : result
            }\`\`\``
          );
        message.channel.send(embed);
      }
    };

    try {
      const wrappedCode = `(async function() {\n${code}\n}).bind(this)().then(onSuccess.bind(this)).catch(onError.bind(this));`;
      eval(wrappedCode);
    } catch (err) {
      onError(err);
    }
  }
}

export default EvalCommand;
