import { ApiOperations } from "./ApiOperations.js";

export class ImageApiOperations extends ApiOperations {
  static _endpoints = {
    imageBinary: "/images/{uuid}/binary",
  };

  // Download remote image
  async getImageBinary(uuid) {
    const context = "downloadImage";

    const endpointUrl = this.getUuidEndpoint("imageBinary", uuid);
    const response = await this.fetchEndpointWithRetry(
      endpointUrl,
      { method: "GET", headers: { Accept: "application/octet-stream" } },
      {},
      context,
    );
    return response;
  }
}
