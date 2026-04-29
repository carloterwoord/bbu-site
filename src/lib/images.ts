type ImageAltValue = string | null | undefined;

function cleanAlt(value: ImageAltValue) {
  return value?.trim() ?? "";
}

export function getImageAlt(explicitAlt: ImageAltValue, fallbackAlt: ImageAltValue = "") {
  return cleanAlt(explicitAlt) || cleanAlt(fallbackAlt);
}

export function getPostCoverAlt(explicitAlt: ImageAltValue, title: string) {
  return getImageAlt(explicitAlt, `Featured image for ${title}`);
}

export function getAvatarAlt(explicitAlt: ImageAltValue, name: string) {
  return getImageAlt(explicitAlt, `Portrait of ${name}`);
}

export function getHeaderImageAlt(explicitAlt: ImageAltValue, title: string) {
  return getImageAlt(explicitAlt, `Header image for ${title}`);
}
