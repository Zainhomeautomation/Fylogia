import { locationResponse } from "../../server/location.mjs";
export const onRequest = ({ request }) => locationResponse(request);
