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
