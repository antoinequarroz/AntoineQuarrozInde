<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'admin' })

type TotpFactor = {
  id: string
  friendly_name?: string
  factor_type: 'totp'
  status: 'verified' | 'unverified'
  created_at: string
  updated_at: string
  last_challenged_at?: string
}

type TotpEnrollment = {
  factorId: string
  qrCode: string
  secret: string
}

const auth = useAuthStore()
const route = useRoute()
const client = useSupabaseClient()

const factors = ref<TotpFactor[]>([])
const selectedFactorId = ref('')
const enrollment = ref<TotpEnrollment | null>(null)
const verificationCode = ref('')
const loading = ref(true)
const submitting = ref(false)
const actionError = ref('')
const statusMessage = ref('')
const pendingRemovalFactorId = ref<string | null>(null)
const codeInput = ref<HTMLInputElement | null>(null)

const verifiedFactors = computed(() => factors.value.filter(factor => factor.status === 'verified'))
const unverifiedFactors = computed(() => factors.value.filter(factor => factor.status === 'unverified'))
const needsChallenge = computed(() => auth.mfaCurrentLevel !== 'aal2' && verifiedFactors.value.length > 0)
const needsEnrollment = computed(() => auth.adminMfaMode === 'required' && verifiedFactors.value.length === 0)
const isProtected = computed(() => auth.mfaCurrentLevel === 'aal2')

function qrImageSource(value: string) {
  return value.startsWith('data:') ? value : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`
}

function factorLabel(factor: TotpFactor, index: number) {
  return factor.friendly_name?.trim() || `Application d’authentification ${index + 1}`
}

function readableDate(value: string) {
  return new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(value))
}

function removalTriggerId(factorId: string) {
  return `remove-factor-${factorId}`
}

function removalCancelId(factorId: string) {
  return `cancel-remove-factor-${factorId}`
}

async function focusElement(id: string) {
  await nextTick()
  document.getElementById(id)?.focus()
}

function requestFactorRemoval(factorId: string) {
  pendingRemovalFactorId.value = factorId
  void focusElement(removalCancelId(factorId))
}

function cancelFactorRemoval(factorId: string) {
  pendingRemovalFactorId.value = null
  void focusElement(removalTriggerId(factorId))
}

function setActionError(message: string) {
  actionError.value = message
  void nextTick(() => codeInput.value?.focus())
}

function updateVerificationCode(event: Event) {
  verificationCode.value = normalizeTotpCode((event.target as HTMLInputElement).value)
}

async function loadFactors(options: { refreshAssurance?: boolean } = {}) {
  loading.value = true
  actionError.value = ''
  try {
    if (options.refreshAssurance !== false) {
      const assuranceAvailable = await auth.refreshMfaState()
      if (!assuranceAvailable) {
        actionError.value = auth.mfaError
        return
      }
    }

    const { data, error } = await client.auth.mfa.listFactors()
    if (error) throw error
    factors.value = data.all.filter((factor): factor is TotpFactor => factor.factor_type === 'totp')

    if (!verifiedFactors.value.some(factor => factor.id === selectedFactorId.value)) {
      selectedFactorId.value = verifiedFactors.value[0]?.id ?? ''
    }
  }
  catch {
    actionError.value = 'Les méthodes de vérification n’ont pas pu être chargées. Réessaie dans un instant.'
  }
  finally {
    loading.value = false
  }
}

async function startEnrollment() {
  submitting.value = true
  actionError.value = ''
  statusMessage.value = ''
  try {
    const { data, error } = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Administration Antoine Quarroz',
      issuer: 'Antoine Quarroz',
    })
    if (error || data.type !== 'totp') throw error || new Error('Unsupported factor')
    enrollment.value = {
      factorId: data.id,
      qrCode: qrImageSource(data.totp.qr_code),
      secret: data.totp.secret,
    }
    verificationCode.value = ''
    statusMessage.value = 'Scanne le QR code, puis saisis le code à six chiffres.'
    await focusElement('enrollment-title')
  }
  catch {
    actionError.value = 'La configuration n’a pas pu démarrer. Vérifie ta connexion puis réessaie.'
  }
  finally {
    submitting.value = false
  }
}

async function verifyFactor(factorId: string) {
  if (verificationCode.value.length !== 6) {
    setActionError('Saisis le code complet à six chiffres affiché dans ton application.')
    return
  }

  submitting.value = true
  actionError.value = ''
  statusMessage.value = ''
  try {
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: verificationCode.value,
    })
    if (error) throw error

    verificationCode.value = ''
    enrollment.value = null
    const sessionReady = await auth.checkSession({ deferOrganizationsUntilMfa: true })
    if (!sessionReady || auth.requiresAdminMfa) throw new Error('MFA session was not upgraded')
    await loadFactors({ refreshAssurance: false })
    statusMessage.value = 'Vérification réussie. La session est maintenant protégée.'

    if (route.query.redirect) {
      await navigateTo(safeMfaRedirect(route.query.redirect), { replace: true })
    }
  }
  catch {
    setActionError('Le code est invalide ou a expiré. Utilise le nouveau code affiché par ton application.')
  }
  finally {
    submitting.value = false
  }
}

async function verifyEnrollment() {
  if (!enrollment.value) return
  await verifyFactor(enrollment.value.factorId)
}

async function verifyExistingFactor() {
  if (!selectedFactorId.value) {
    setActionError('Sélectionne une méthode de vérification.')
    return
  }
  await verifyFactor(selectedFactorId.value)
}

async function cancelEnrollment() {
  const currentEnrollment = enrollment.value
  enrollment.value = null
  verificationCode.value = ''
  actionError.value = ''
  if (!currentEnrollment) return

  submitting.value = true
  try {
    const { error } = await client.auth.mfa.unenroll({ factorId: currentEnrollment.factorId })
    if (error) throw error
    statusMessage.value = 'Configuration annulée.'
    await loadFactors({ refreshAssurance: false })
  }
  catch {
    await loadFactors({ refreshAssurance: false })
    actionError.value = 'La configuration a été annulée, mais son brouillon n’a pas pu être supprimé. Tu peux le retirer ci-dessous.'
  }
  finally {
    submitting.value = false
  }
}

function removalBlocked(factor: TotpFactor) {
  return factor.status === 'verified'
    && auth.adminMfaMode === 'required'
    && verifiedFactors.value.length <= 1
}

async function removeFactor(factor: TotpFactor) {
  if (removalBlocked(factor)) return
  if (factor.status === 'verified' && auth.mfaCurrentLevel !== 'aal2') {
    actionError.value = 'Vérifie d’abord ta session avant de retirer cette méthode.'
    return
  }

  submitting.value = true
  actionError.value = ''
  statusMessage.value = ''
  try {
    const { error } = await client.auth.mfa.unenroll({ factorId: factor.id })
    if (error) throw error
    pendingRemovalFactorId.value = null
    const refresh = await client.auth.refreshSession()
    if (refresh.error) throw refresh.error
    await auth.checkSession({ deferOrganizationsUntilMfa: true })
    await loadFactors({ refreshAssurance: false })
    statusMessage.value = 'La méthode de vérification a été retirée.'
    await focusElement(factor.status === 'verified' && verifiedFactors.value.length
      ? 'verified-factors-title'
      : (unverifiedFactors.value.length ? 'unfinished-title' : 'status-title'))
  }
  catch {
    actionError.value = 'Cette méthode n’a pas pu être retirée. Réessaie après une nouvelle vérification.'
  }
  finally {
    submitting.value = false
  }
}

async function logout() {
  await auth.logout()
  await navigateTo('/admin/login', { replace: true })
}

useHead({ title: 'Sécurité du compte — Administration' })
onMounted(() => loadFactors())
</script>

<template>
  <div class="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-[#0b0b12] dark:text-white sm:py-10">
    <main class="mx-auto w-full max-w-3xl" aria-labelledby="security-title">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Compte administrateur</p>
          <h1 id="security-title" class="font-display text-2xl font-bold sm:text-3xl">Sécurité et double authentification</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Protège l’administration avec un code temporaire généré sur ton téléphone.
          </p>
        </div>
        <button type="button" class="min-h-11 self-start rounded-xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="logout">
          Se déconnecter
        </button>
      </header>

      <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
      <div v-if="actionError" id="mfa-action-error" role="alert" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
        {{ actionError }}
      </div>

      <section v-if="loading" class="admin-card" aria-busy="true">
        <p role="status" class="py-8 text-center text-sm text-gray-600 dark:text-gray-300">Vérification de la sécurité de la session…</p>
      </section>

      <template v-else>
        <section v-if="!auth.mfaAssuranceKnown" class="admin-card p-5 sm:p-7" aria-labelledby="assurance-error-title">
          <h2 id="assurance-error-title" class="font-display text-lg font-bold">Vérification momentanément indisponible</h2>
          <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">L’administration reste verrouillée tant que le niveau de sécurité de la session n’est pas confirmé.</p>
          <button type="button" class="btn-primary mt-5 min-h-11 justify-center" :disabled="loading" @click="loadFactors()">Réessayer la vérification</button>
        </section>

        <section v-else-if="needsChallenge" class="admin-card p-5 sm:p-7" aria-labelledby="challenge-title">
          <div class="mb-5 flex items-start gap-3">
            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden="true">
              <AdminAdminIcon icon="shield" class="h-5 w-5" />
            </div>
            <div>
              <h2 id="challenge-title" class="font-display text-lg font-bold">Confirme que c’est bien toi</h2>
              <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">Ouvre ton application d’authentification et saisis le code actuel.</p>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="verifyExistingFactor">
            <div v-if="verifiedFactors.length > 1">
              <label for="challenge-factor" class="mb-2 block text-sm font-semibold">Méthode de vérification</label>
              <select id="challenge-factor" v-model="selectedFactorId" class="input-field">
                <option v-for="(factor, index) in verifiedFactors" :key="factor.id" :value="factor.id">{{ factorLabel(factor, index) }}</option>
              </select>
            </div>
            <div>
              <label for="challenge-code" class="mb-2 block text-sm font-semibold">Code à six chiffres</label>
              <input
                id="challenge-code"
                ref="codeInput"
                :value="verificationCode"
                type="text"
                name="one-time-code"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{6}"
                maxlength="6"
                class="input-field text-center font-mono text-xl tracking-[0.35em]"
                :aria-invalid="Boolean(actionError)"
                :aria-describedby="actionError ? 'mfa-action-error challenge-code-help' : 'challenge-code-help'"
                autofocus
                @input="updateVerificationCode"
              >
              <p id="challenge-code-help" class="mt-2 text-xs text-gray-500 dark:text-gray-400">Le code change toutes les 30 secondes. Le collage est autorisé.</p>
            </div>
            <button type="submit" class="btn-primary min-h-11 w-full justify-center sm:w-auto" :disabled="submitting">
              {{ submitting ? 'Vérification…' : 'Vérifier et continuer' }}
            </button>
          </form>
        </section>

        <section v-else-if="enrollment" class="admin-card p-5 sm:p-7" aria-labelledby="enrollment-title">
          <h2 id="enrollment-title" tabindex="-1" class="font-display text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Configurer l’application d’authentification</h2>
          <ol class="mt-4 space-y-5 text-sm text-gray-700 dark:text-gray-200">
            <li>
              <p class="mb-3 font-semibold">1. Scanne ce QR code</p>
              <div class="w-fit rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <img :src="enrollment.qrCode" alt="QR code à scanner avec l’application d’authentification" class="h-44 w-44 sm:h-52 sm:w-52">
              </div>
            </li>
            <li>
              <p class="font-semibold">2. Si le scan ne fonctionne pas, saisis cette clé</p>
              <p class="mt-2 break-all rounded-xl bg-gray-100 p-3 font-mono text-sm text-gray-900 dark:bg-white/[0.06] dark:text-white" aria-label="Clé secrète à saisir manuellement">{{ enrollment.secret }}</p>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Cette clé est confidentielle : ne la partage pas et ne la conserve pas dans une capture d’écran.</p>
            </li>
          </ol>

          <form class="mt-6 space-y-4" @submit.prevent="verifyEnrollment">
            <div>
              <label for="enrollment-code" class="mb-2 block text-sm font-semibold">3. Confirme avec le code à six chiffres</label>
              <input
                id="enrollment-code"
                ref="codeInput"
                :value="verificationCode"
                type="text"
                name="one-time-code"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{6}"
                maxlength="6"
                class="input-field text-center font-mono text-xl tracking-[0.35em]"
                :aria-invalid="Boolean(actionError)"
                :aria-describedby="actionError ? 'mfa-action-error enrollment-code-help' : 'enrollment-code-help'"
                @input="updateVerificationCode"
              >
              <p id="enrollment-code-help" class="mt-2 text-xs text-gray-500 dark:text-gray-400">Le code confirme que la configuration fonctionne avant son activation.</p>
            </div>
            <div class="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" class="min-h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-white/[0.12] dark:hover:bg-white/[0.05]" :disabled="submitting" @click="cancelEnrollment">Annuler</button>
              <button type="submit" class="btn-primary min-h-11 justify-center" :disabled="submitting">{{ submitting ? 'Activation…' : 'Activer la double authentification' }}</button>
            </div>
          </form>
        </section>

        <template v-else>
          <section class="admin-card p-5 sm:p-7" aria-labelledby="status-title">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="status-title" tabindex="-1" class="font-display text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">État de la protection</h2>
                <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  <template v-if="isProtected">Ta session est vérifiée avec deux facteurs.</template>
                  <template v-else-if="needsEnrollment">La double authentification est obligatoire pour accéder à l’administration.</template>
                  <template v-else>La double authentification est facultative, mais vivement recommandée.</template>
                </p>
              </div>
              <span class="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" :class="isProtected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'">
                <span class="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                {{ isProtected ? 'Session protégée' : (needsEnrollment ? 'Configuration nécessaire' : 'Protection facultative') }}
              </span>
            </div>

            <button v-if="verifiedFactors.length === 0" type="button" class="btn-primary mt-5 min-h-11 w-full justify-center sm:w-auto" :disabled="submitting" @click="startEnrollment">
              {{ submitting ? 'Préparation…' : 'Configurer une application' }}
            </button>
          </section>

          <section v-if="verifiedFactors.length" class="admin-card mt-4 p-5 sm:p-7" aria-labelledby="verified-factors-title">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="verified-factors-title" tabindex="-1" class="font-display text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Méthodes actives</h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Gère les applications déjà vérifiées.</p>
              </div>
              <button type="button" class="min-h-11 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-violet-500/30 dark:text-violet-200 dark:hover:bg-violet-500/10" :disabled="submitting" @click="startEnrollment">Ajouter une méthode</button>
            </div>

            <ul class="mt-5 divide-y divide-gray-100 dark:divide-white/[0.06]">
              <li v-for="(factor, index) in verifiedFactors" :key="factor.id" class="py-4 first:pt-0 last:pb-0">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="font-semibold">{{ factorLabel(factor, index) }}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Activée le {{ readableDate(factor.created_at) }}</p>
                  </div>
                  <div v-if="pendingRemovalFactorId !== factor.id">
                    <button :id="removalTriggerId(factor.id)" type="button" class="min-h-11 rounded-xl px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10 dark:disabled:text-gray-500" :disabled="submitting || removalBlocked(factor)" :aria-describedby="removalBlocked(factor) ? `factor-${factor.id}-removal-help` : undefined" @click="requestFactorRemoval(factor.id)">
                      Retirer
                    </button>
                    <p v-if="removalBlocked(factor)" :id="`factor-${factor.id}-removal-help`" class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">Ajoute d’abord une autre méthode : le mode requis interdit de retirer la dernière.</p>
                  </div>
                  <div v-else class="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                    <p class="text-sm font-semibold text-red-900 dark:text-red-100">Confirmer le retrait ?</p>
                    <div class="mt-2 flex gap-2">
                      <button :id="removalCancelId(factor.id)" type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-white/[0.06]" @click="cancelFactorRemoval(factor.id)">Annuler</button>
                      <button type="button" class="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" :disabled="submitting" @click="removeFactor(factor)">{{ submitting ? 'Retrait…' : 'Oui, retirer' }}</button>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section v-if="unverifiedFactors.length" class="admin-card mt-4 p-5 sm:p-7" aria-labelledby="unfinished-title">
            <h2 id="unfinished-title" tabindex="-1" class="font-display text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Configurations inachevées</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Ces essais ne protègent pas encore le compte et peuvent être supprimés.</p>
            <ul class="mt-4 space-y-3">
              <li v-for="(factor, index) in unverifiedFactors" :key="factor.id" class="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.1]">
                <span class="text-sm font-medium">{{ factorLabel(factor, index) }}</span>
                <button v-if="pendingRemovalFactorId !== factor.id" :id="removalTriggerId(factor.id)" type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" @click="requestFactorRemoval(factor.id)">Supprimer le brouillon</button>
                <div v-else class="flex gap-2">
                  <button :id="removalCancelId(factor.id)" type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold" @click="cancelFactorRemoval(factor.id)">Annuler</button>
                  <button type="button" class="min-h-11 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white" :disabled="submitting" @click="removeFactor(factor)">Confirmer</button>
                </div>
              </li>
            </ul>
          </section>

          <div v-if="!auth.requiresAdminMfa" class="mt-5 text-center">
            <NuxtLink :to="safeMfaRedirect(route.query.redirect)" class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-violet-700 underline decoration-violet-300 underline-offset-4 hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:text-violet-300 dark:hover:text-violet-100">
              Continuer vers l’administration
            </NuxtLink>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>
