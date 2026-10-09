/** Makes user input match literally inside LIKE (MySQL's default escape character is "\"). */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
