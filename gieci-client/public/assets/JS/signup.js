document.addEventListener("DOMContentLoaded", () => {
    console.log("Signup.js carregado corretamente.");

    const form = document.getElementById("signup-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput =
        document.getElementById("confirm-password");

    const button =
        document.getElementById("signup-button");

    const message =
        document.getElementById("signup-message");

    if (
        !form ||
        !emailInput ||
        !passwordInput ||
        !confirmPasswordInput ||
        !button ||
        !message
    ) {
        console.error(
            "Erro: elementos do formulário não encontrados."
        );

        return;
    }

    function mostrarMensagem(texto, tipo = "erro") {
        message.textContent = texto;

        message.style.color =
            tipo === "sucesso"
                ? "#2e6f4b"
                : "#b23b3b";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("Formulário interceptado.");

        message.textContent = "";

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;

        const confirmPassword =
            confirmPasswordInput.value;

        if (!email) {
            mostrarMensagem(
                "Digite seu e-mail."
            );

            return;
        }

        if (password.length < 8) {
            mostrarMensagem(
                "A senha precisa ter pelo menos 8 caracteres."
            );

            return;
        }

        if (password !== confirmPassword) {
            mostrarMensagem(
                "As senhas não coincidem."
            );

            return;
        }

        button.disabled = true;
        button.textContent =
            "Cadastrando...";

        try {
            console.log(
                "Enviando cadastro para /api/auth/register"
            );

            const response =
                await fetch(
                    "/api/auth/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "include",

                        body:
                            JSON.stringify({
                                email,
                                password
                            })
                    }
                );

            console.log(
                "Status:",
                response.status
            );

            const data =
                await response.json();

            console.log(
                "Resposta:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Não foi possível cadastrar."
                );
            }

            mostrarMensagem(
                "Cadastro realizado com sucesso!",
                "sucesso"
            );

            form.reset();

            setTimeout(() => {
                window.location.href = "/";
            }, 1500);

        } catch (error) {
            console.error(
                "Erro no cadastro:",
                error
            );

            mostrarMensagem(
                error.message ||
                    "Erro ao conectar com o servidor."
            );

        } finally {
            button.disabled = false;

            button.textContent =
                "Cadastrar";
        }
    });
});