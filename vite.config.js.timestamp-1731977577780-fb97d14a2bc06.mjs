// vite.config.js
import { sentryVitePlugin } from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/vite/dist/node/index.js";
import Vue from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import mkcert from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
import { nodePolyfills } from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/vite-plugin-node-polyfills/dist/index.js";
import UnheadVite from "file:///Users/zio4/Code/stanford/levante/levante-dashboard/node_modules/@unhead/addons/dist/vite.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/zio4/Code/stanford/levante/levante-dashboard/vite.config.js";
var vite_config_default = defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/]
    }),
    nodePolyfills({
      globals: {
        process: true
      }
    }),
    UnheadVite(),
    ...process.env.NODE_ENV === "development" ? [mkcert()] : [],
    ...process.env.NODE_ENV !== "development" ? [
      sentryVitePlugin({
        org: "roar-89588e380",
        project: "dashboard"
      })
    ] : []
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    fs: {
      allow: [".."]
    }
  },
  build: {
    cssCodeSplit: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lodash: ["lodash"],
          tanstack: ["@tanstack/vue-query"],
          chartJs: ["chart.js"],
          sentry: ["@sentry/browser", "@sentry/integrations", "@sentry/vue", "@sentry/wasm"],
          roam: ["@bdelab/roam-apps"],
          firekit: ["@bdelab/roar-firekit"],
          letter: ["@bdelab/roar-letter"],
          multichoice: ["@bdelab/roar-multichoice"],
          phoneme: ["@bdelab/roar-pa"],
          sre: ["@bdelab/roar-sre"],
          swr: ["@bdelab/roar-swr"],
          utils: ["@bdelab/roar-utils"],
          vocab: ["@bdelab/roar-vocab"],
          ran: ["@bdelab/roav-ran"],
          crowding: ["@bdelab/roav-crowding"],
          "roav-mep": ["@bdelab/roav-mep"]
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "@bdelab/roar-firekit",
      "vue-google-maps-community-fork",
      "fast-deep-equal"
      // Required due to https://github.com/nathanap/vue-google-maps-community-fork/issues/4
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvemlvNC9Db2RlL3N0YW5mb3JkL2xldmFudGUvbGV2YW50ZS1kYXNoYm9hcmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy96aW80L0NvZGUvc3RhbmZvcmQvbGV2YW50ZS9sZXZhbnRlLWRhc2hib2FyZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvemlvNC9Db2RlL3N0YW5mb3JkL2xldmFudGUvbGV2YW50ZS1kYXNoYm9hcmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSAnQHNlbnRyeS92aXRlLXBsdWdpbic7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgVnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XG5pbXBvcnQgbWtjZXJ0IGZyb20gJ3ZpdGUtcGx1Z2luLW1rY2VydCc7XG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xuaW1wb3J0IFVuaGVhZFZpdGUgZnJvbSAnQHVuaGVhZC9hZGRvbnMvdml0ZSc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgVnVlKHtcbiAgICAgIGluY2x1ZGU6IFsvXFwudnVlJC8sIC9cXC5tZCQvXSxcbiAgICB9KSxcbiAgICBub2RlUG9seWZpbGxzKHtcbiAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgcHJvY2VzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgVW5oZWFkVml0ZSgpLFxuICAgIC4uLihwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyA/IFtta2NlcnQoKV0gOiBbXSksXG4gICAgLi4uKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAnZGV2ZWxvcG1lbnQnXG4gICAgICA/IFtcbiAgICAgICAgICBzZW50cnlWaXRlUGx1Z2luKHtcbiAgICAgICAgICAgIG9yZzogJ3JvYXItODk1ODhlMzgwJyxcbiAgICAgICAgICAgIHByb2plY3Q6ICdkYXNoYm9hcmQnLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdXG4gICAgICA6IFtdKSxcbiAgXSxcblxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgIH0sXG4gIH0sXG5cbiAgc2VydmVyOiB7XG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbJy4uJ10sXG4gICAgfSxcbiAgfSxcblxuICBidWlsZDoge1xuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIGxvZGFzaDogWydsb2Rhc2gnXSxcbiAgICAgICAgICB0YW5zdGFjazogWydAdGFuc3RhY2svdnVlLXF1ZXJ5J10sXG4gICAgICAgICAgY2hhcnRKczogWydjaGFydC5qcyddLFxuICAgICAgICAgIHNlbnRyeTogWydAc2VudHJ5L2Jyb3dzZXInLCAnQHNlbnRyeS9pbnRlZ3JhdGlvbnMnLCAnQHNlbnRyeS92dWUnLCAnQHNlbnRyeS93YXNtJ10sXG4gICAgICAgICAgcm9hbTogWydAYmRlbGFiL3JvYW0tYXBwcyddLFxuICAgICAgICAgIGZpcmVraXQ6IFsnQGJkZWxhYi9yb2FyLWZpcmVraXQnXSxcbiAgICAgICAgICBsZXR0ZXI6IFsnQGJkZWxhYi9yb2FyLWxldHRlciddLFxuICAgICAgICAgIG11bHRpY2hvaWNlOiBbJ0BiZGVsYWIvcm9hci1tdWx0aWNob2ljZSddLFxuICAgICAgICAgIHBob25lbWU6IFsnQGJkZWxhYi9yb2FyLXBhJ10sXG4gICAgICAgICAgc3JlOiBbJ0BiZGVsYWIvcm9hci1zcmUnXSxcbiAgICAgICAgICBzd3I6IFsnQGJkZWxhYi9yb2FyLXN3ciddLFxuICAgICAgICAgIHV0aWxzOiBbJ0BiZGVsYWIvcm9hci11dGlscyddLFxuICAgICAgICAgIHZvY2FiOiBbJ0BiZGVsYWIvcm9hci12b2NhYiddLFxuICAgICAgICAgIHJhbjogWydAYmRlbGFiL3JvYXYtcmFuJ10sXG4gICAgICAgICAgY3Jvd2Rpbmc6IFsnQGJkZWxhYi9yb2F2LWNyb3dkaW5nJ10sXG4gICAgICAgICAgJ3JvYXYtbWVwJzogWydAYmRlbGFiL3JvYXYtbWVwJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdAYmRlbGFiL3JvYXItZmlyZWtpdCcsXG4gICAgICAndnVlLWdvb2dsZS1tYXBzLWNvbW11bml0eS1mb3JrJyxcbiAgICAgICdmYXN0LWRlZXAtZXF1YWwnLCAvLyBSZXF1aXJlZCBkdWUgdG8gaHR0cHM6Ly9naXRodWIuY29tL25hdGhhbmFwL3Z1ZS1nb29nbGUtbWFwcy1jb21tdW5pdHktZm9yay9pc3N1ZXMvNFxuICAgIF0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlUsU0FBUyx3QkFBd0I7QUFDNVcsU0FBUyxlQUFlLFdBQVc7QUFDbkMsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUNuQixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLGdCQUFnQjtBQU51TCxJQUFNLDJDQUEyQztBQVMvUCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsTUFDRixTQUFTLENBQUMsVUFBVSxPQUFPO0FBQUEsSUFDN0IsQ0FBQztBQUFBLElBQ0QsY0FBYztBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1AsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQSxJQUNYLEdBQUksUUFBUSxJQUFJLGFBQWEsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUFBLElBQzNELEdBQUksUUFBUSxJQUFJLGFBQWEsZ0JBQ3pCO0FBQUEsTUFDRSxpQkFBaUI7QUFBQSxRQUNmLEtBQUs7QUFBQSxRQUNMLFNBQVM7QUFBQSxNQUNYLENBQUM7QUFBQSxJQUNILElBQ0EsQ0FBQztBQUFBLEVBQ1A7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixPQUFPLENBQUMsSUFBSTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsUUFBUTtBQUFBLFVBQ2pCLFVBQVUsQ0FBQyxxQkFBcUI7QUFBQSxVQUNoQyxTQUFTLENBQUMsVUFBVTtBQUFBLFVBQ3BCLFFBQVEsQ0FBQyxtQkFBbUIsd0JBQXdCLGVBQWUsY0FBYztBQUFBLFVBQ2pGLE1BQU0sQ0FBQyxtQkFBbUI7QUFBQSxVQUMxQixTQUFTLENBQUMsc0JBQXNCO0FBQUEsVUFDaEMsUUFBUSxDQUFDLHFCQUFxQjtBQUFBLFVBQzlCLGFBQWEsQ0FBQywwQkFBMEI7QUFBQSxVQUN4QyxTQUFTLENBQUMsaUJBQWlCO0FBQUEsVUFDM0IsS0FBSyxDQUFDLGtCQUFrQjtBQUFBLFVBQ3hCLEtBQUssQ0FBQyxrQkFBa0I7QUFBQSxVQUN4QixPQUFPLENBQUMsb0JBQW9CO0FBQUEsVUFDNUIsT0FBTyxDQUFDLG9CQUFvQjtBQUFBLFVBQzVCLEtBQUssQ0FBQyxrQkFBa0I7QUFBQSxVQUN4QixVQUFVLENBQUMsdUJBQXVCO0FBQUEsVUFDbEMsWUFBWSxDQUFDLGtCQUFrQjtBQUFBLFFBQ2pDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUE7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
