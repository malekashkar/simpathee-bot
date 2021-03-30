import chalk from "chalk";
import moment from "moment";

class Logger {
  /**
   * Gets the name of the file this method was called from
   */
  static getCallingFilename(n = 1, err: Error = null) {
    let info = "";
    try {
      throw new Error();
    } catch (e) {
      const error = err || (e as Error);
      const lines = error.stack.split("\n");
      const line = lines[n] || "";
      const matched = line.match(/([\w\d\-_.]*:\d+:\d+)/);
      info = matched?.[1];
    }
    return info;
  }

  /**
   * Gets log string given the necessary arguments
   */
  static getLogString(type: string, tag: string, text: string | Error, n = 0) {
    if (!tag || !text) return "";
    if (typeof tag !== "string")
      // eslint-disable-next-line
      tag = (tag as any).toString();
    if (typeof text !== "string" && !(text instanceof Error))
      // eslint-disable-next-line
      text = (text as any).toString();
    n = n || text instanceof Error ? 2 : 4;
    tag = tag.trim().split("\n").join("_");
    const lines =
      text instanceof Error
        ? text.stack
            .trim()
            .split("\n")
            .map((x) => x.trim()) ||
          `${text.name} - ${text.message}`.split("\n")
        : text.toString().trim().split("\n");
    const logStrings = [];
    for (const line of lines) {
      logStrings.push(
        `[${type}] [${moment().format(
          "DD-MM-YYYY, hh:mm:ss A"
        )}] [${this.getCallingFilename(
          n,
          text instanceof Error ? text : null
        )}] [${tag}] [${line}]`
      );
    }

    return logStrings.join("\n");
  }

  /**
   * Outputs a debug log, used for temporary logs during development
   */
  static debug(tag: string, text: string, n = 0) {
    const logString = this.getLogString("D", tag, text, n);
    console.log(chalk.blue(logString));
  }

  /**
   * Outputs a error log, used for reporting errors
   */
  static error(tag: string, text: string | Error, n = 0) {
    const logString = this.getLogString("E", tag, text, n);
    console.log(chalk.red(logString));
  }

  /**
   * Outputs a info log, used for providing information
   */
  static info(tag: string, text: string, n = 0) {
    const logString = this.getLogString("I", tag, text, n);
    console.log(chalk.green(logString));
  }

  /**
   * Outputs a verbose log, used for everything else
   */
  static verbose(tag: string, text: string, n = 0) {
    const logString = this.getLogString("V", tag, text, n);
    console.log(chalk.hex("#DDA0DD")(logString));
  }

  /**
   * Outputs a warn log, used for warning
   */
  static warn(tag: string, text: string, n = 0) {
    const logString = this.getLogString("W", tag, text, n);
    console.log(chalk.yellow(logString));
  }
}

export default Logger;
