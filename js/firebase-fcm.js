const messaging = firebase.messaging();

window.iniciarNotificacoes = async function () {

    try {

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            console.log("Permissão negada");
            return;
        }

        const registration = await navigator.serviceWorker.ready;

        const token = await messaging.getToken({
            vapidKey: "BG6tmpS6lsZ4iRMR5YJypbiWSZ-IzHKTi2b-4nix9EQR5LinxnsjNtkrs0A0rsEBxdt8-dqd2TRljeZ2RRUInJQ",
            serviceWorkerRegistration: registration
        });

        console.log("TOKEN FCM:", token);

        const usuario = JSON.parse(localStorage.getItem("usuario"));

        if (usuario && token) {
            db.ref("tokens/" + usuario.id).set(token);
        }

    } catch (erro) {

        console.error("Erro FCM", erro);

    }

};

messaging.onMessage((payload) => {

    console.log("Notificação recebida:", payload);

    new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/icons/icon-192.png"
    });

});
