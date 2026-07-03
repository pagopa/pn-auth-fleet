// Body posted by the frontend to /exchange. The short-lived fimsToken (issued by
// /token, delivered in the redirect fragment) is carried in `authorizationToken`,
// the same field name tokenExchange uses.
export interface FimsExchangeRequestBody {
  authorizationToken: string;
}
