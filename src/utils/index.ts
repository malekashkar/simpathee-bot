export function mcNameValidation(name: string) {
  if (name.includes(" ")) return false;
  const re = new RegExp(/[\w\d]{2,17}/m);
  const regexTest = re.test(name);
  if (!regexTest) return false;
  return true;
}

export function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join(" ");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rgbToHex(r: string, g: string, b: string) {
  const componentToHex = (hex: string) => (hex.length == 1 ? "0" + hex : hex);
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
export function minifyNumber(num: number) {
  if (num >= 1000 && num < 1000000) {
    return `${(num / 1000).toFixed(2)}` + `K`;
  } else if (num >= 1000000 && num < 1000000000) {
    return `${(num / 1000000).toFixed(3)}` + `M`;
  } else if (num >= 1000000000 && num < 1000000000000) {
    return `${(num / 1000000000).toFixed(3)}` + `B`;
  }
}

export function commafyNumber(num: number) {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
