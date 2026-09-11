import * as React from "react";
import { Mail, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface FormState {
  name: string;
  email: string;
  message: string;
  acceptedPolicy: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  acceptedPolicy?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Informe seu nome.";
  if (!form.email.trim()) {
    errors.email = "Informe seu email.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "O formato do email não é válido.";
  }
  if (!form.message.trim()) errors.message = "Escreva sua mensagem.";
  if (!form.acceptedPolicy) {
    errors.acceptedPolicy = "Você precisa aceitar a política de privacidade.";
  }
  return errors;
}

export function ContactSection() {
  const [form, setForm] = React.useState<FormState>({
    name: "",
    email: "",
    message: "",
    acceptedPolicy: false,
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitted, setSubmitted] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      // TODO: conectar a um endpoint real quando estiver definido.
      setSubmitted(true);
      setForm({ name: "", email: "", message: "", acceptedPolicy: false });
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Estamos aqui para ajudar
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 size-5 shrink-0 text-accent" />
            <div>
              <p className="font-heading text-sm font-semibold text-primary">
                Oficina
              </p>
              <p className="text-sm text-text-muted">
                Atendimento com hora marcada
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-1 size-5 shrink-0 text-accent" />
            <div>
              <p className="font-heading text-sm font-semibold text-primary">
                Horário
              </p>
              <p className="text-sm text-text-muted">
                Segunda a sexta · 9h–18h
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-1 size-5 shrink-0 text-accent" />
            <div>
              <p className="font-heading text-sm font-semibold text-primary">
                Email
              </p>
              <a
                href="mailto:contato@malatrasiwoodworks.com.br"
                className="text-sm text-text-muted hover:text-accent"
              >
                contato@malatrasiwoodworks.com.br
              </a>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-brand border border-black/10 bg-white p-6"
        >
          {submitted && (
            <div className="mb-4 flex items-center gap-2 rounded-brand bg-success/10 px-4 py-3 text-sm font-medium text-success">
              <CheckCircle2 className="size-5 shrink-0" />
              Mensagem enviada! Responderemos o quanto antes.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Nome</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-accent">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-accent">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Mensagem</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                aria-invalid={!!errors.message}
              />
              {errors.message && (
                <p className="text-xs text-accent">{errors.message}</p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-accent"
                  checked={form.acceptedPolicy}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      acceptedPolicy: e.target.checked,
                    }))
                  }
                />
                Aceito a{" "}
                <a href="/privacidade" className="text-accent hover:underline">
                  política de privacidade
                </a>{" "}
                da Malatrasi WoodWorks.
              </label>
              {errors.acceptedPolicy && (
                <p className="mt-1 text-xs text-accent">
                  {errors.acceptedPolicy}
                </p>
              )}
            </div>

            <Button type="submit" variant="accent" className="w-full">
              Enviar mensagem
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
