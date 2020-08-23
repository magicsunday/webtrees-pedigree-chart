import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

export default {
    input: "resources/js/modules/index.js",
    output: [
        {
            name: "WebtreesPedigreeChart",
            file: "resources/js/pedigree-chart.js",
            format: "umd"
        },
        {
            name: "WebtreesPedigreeChart",
            file: "resources/js/pedigree-chart.min.js",
            format: "umd"
        }
    ],
    plugins: [
        resolve(),
        terser({
            mangle: true,
            compress: true,
            module: true,
            // include: [
            //     /^.+\.min\.js$/
            // ],
            output: {
                comments: false
            }
        })
    ]
};
