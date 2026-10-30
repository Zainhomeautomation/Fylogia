import { streamPublication } from "../../server/publication-stream.mjs";
const publication = {
  url: "https://magazine.raspberrypi.com/downloads/eyJfcmFpbHMiOnsiZGF0YSI6OTAxNSwicHVyIjoiYmxvYl9pZCJ9fQ==--7924ebe6f6032fd11237fe5a8dd1f66feaa35f14/HS75_DIGITAL.pdf",
  hosts: ["magazine.raspberrypi.com", "storage.raspberrypi.com"],
  filename: "HackSpace-75.pdf",
};
export function onRequest({ request }) {
  return streamPublication(request, publication);
}
