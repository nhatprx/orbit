FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S orbit && adduser -S orbit -G orbit
COPY --from=build --chown=orbit:orbit /app/target/*.jar app.jar
USER orbit
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health >/dev/null 2>&1 || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
