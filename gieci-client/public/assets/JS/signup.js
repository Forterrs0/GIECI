console.log("Signup.js carregado corretamente.");

const form =
    document.getElementById("signup-form");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirm-password");

const button =
    document.getElementById("signup-button");

const message =
    document.getElementById("signup-message");


function mostrarMensagem(texto, tipo = "erro") {

    message.textContent = texto;

    if (tipo === "sucesso") {
        message.style.color = "#2e6f4b";
    } else {
        message.style.color = "#b23b3b";
    }
}


if (!form) {

    console.error(
        "ERRO: formulário signup-form não encontrado."
    );

} else {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            console.log(
                "Submit interceptado."
            );

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


            if (
                password !==
                confirmPassword
            ) {

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
                    "Enviando POST para /api/auth/register"
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


                const texto =
                    await response.text();


                console.log(
                    "Resposta:",
                    texto
                );


                let data = {};


                if (texto) {

                    try {

                        data =
                            JSON.parse(texto);

                    } catch {

                        throw new Error(
                            "A API não retornou JSON."
                        );
                    }
                }


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.message ||
                        "Não foi possível realizar o cadastro."
                    );
                }


                mostrarMensagem(
                    "Cadastro realizado com sucesso!",
                    "sucesso"
                );


                form.reset();


                setTimeout(
                    function () {

                        window.location.href =
                            "/";

                    },
                    1500
                );


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

                button.disabled =
                    false;


                button.textContent =
                    "Cadastrar";
            }
        }
    );
}
