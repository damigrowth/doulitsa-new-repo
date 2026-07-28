import { NextResponse } from "next/server";

export function stackMiddlewares(functions = [], index = 0) {
  const current = functions[index];
  if (current) {
    const next = stackMiddlewares(functions, index + 1);
    return current(next);
  }
  return () => NextResponse.next();
}
