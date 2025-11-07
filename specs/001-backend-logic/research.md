# Research & Decisions: Mahjong Backend Logic

## Decision: Technology Stack Confirmation

-   **Decision**: The project will be implemented in **Python 3.11+** without any external production dependencies. Testing will use the **pytest** framework. Code quality will be maintained by **ruff**.
-   **Rationale**: This stack was chosen to strictly adhere to the project constitution, which prioritizes simplicity, minimalism, and the use of modern, efficient tooling. By avoiding external frameworks for the core logic, we ensure the library is self-contained and maximally portable.
-   **Alternatives Considered**:
    -   Using a web framework (like FastAPI or Flask): Rejected because the feature spec explicitly defines this as a backend logic engine, not a web service. Building it as a pure library aligns with the "Simplicity" and "Library-First" (implied) principles.
