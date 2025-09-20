 tailwind.config.js
/** @type {import('tailwindcss').Config}*/
export const content = [
    "./home.html", // Ensure this points to your HTML files
    "./Sign_in.html",
    "./Sign_up.html",
    "./User_dashboard.html",
    "./public/script.js",
    // Add other paths if you expand your project
];
export const theme = {
    extend: {},
};
export const plugins = [
     require('@tailwindcss/line-clamp'),
];


