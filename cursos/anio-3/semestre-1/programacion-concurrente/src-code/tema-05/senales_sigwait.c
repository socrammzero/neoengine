/*
 * Especificación de Laboratorio — Tema 5 (Págs. 32-35): Señales POSIX con Espera Síncrona
 * Compilación: gcc -Wall -Wextra -std=c11 -pthread senales_sigwait.c -o senales_sigwait -lrt
 * Bloquea SIGRTMIN en main mediante pthread_sigmask (las hebras hijas heredan la máscara)
 * y dedica una hebra manejadora de eventos usando sigwaitinfo() + envío con sigqueue().
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>
#include <pthread.h>

#define NUM_EVENTOS 2

void *HebraManejadora(void *arg) {
    sigset_t *set = (sigset_t *)arg;
    siginfo_t info;
    int i, s;

    for (i = 0; i < NUM_EVENTOS; i++) {
        s = sigwaitinfo(set, &info);
        if (s == -1) {
            perror("Error en sigwaitinfo: ");
            exit(-1);
        }
        printf("Hebra de eventos recibio senal #%d con valor sival_int = %d\n",
               s, info.si_value.sival_int);
    }
    pthread_exit(NULL);
}

int main(void) {
    sigset_t sigset;
    pthread_t thEventos;
    union sigval v;

    /* 1. Bloquear la señal en main antes de crear hebras (herencia de máscara) */
    sigemptyset(&sigset);
    sigaddset(&sigset, SIGRTMIN);
    if (pthread_sigmask(SIG_BLOCK, &sigset, NULL) != 0) {
        perror("Error en pthread_sigmask: ");
        exit(-1);
    }

    /* 2. Crear la hebra dedicada como manejador síncrono de eventos */
    if (pthread_create(&thEventos, NULL, HebraManejadora, &sigset) != 0) {
        perror("Error en pthread_create: ");
        exit(-1);
    }

    /* 3. Enviar señales de tiempo real encoladas con carga útil (sigqueue) */
    v.sival_int = 10;
    sigqueue(getpid(), SIGRTMIN, v);

    v.sival_int = 30;
    sigqueue(getpid(), SIGRTMIN, v);

    if (pthread_join(thEventos, NULL) != 0) {
        perror("Error en pthread_join: ");
        exit(-1);
    }

    printf("Fin del procesamiento de eventos.\n");
    return 0;
}
