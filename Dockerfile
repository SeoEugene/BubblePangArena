FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
ENV NODE_ENV=production
ENV PORT=3210
ENV HOST=0.0.0.0
USER node
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.ts"]
