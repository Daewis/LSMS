 tailwind.config.js
/** @type {import('tailwindcss').Config}*/
export const content = [
    "./public/home.html",
    "./public/Sign_in.html",
    "./public/Sign_up.html",
    "./public/User_dashboard.html",
    "./public/script.js",
];

export const theme = {
    extend: {},
};
export const plugins = [
     require('@tailwindcss/line-clamp'),
];


