# Company Brain: Human-Approved Operational Memory for Enterprise AI Agents

Aditya Shinde  
Company Brain Technical Report, Version 0.1  
May 2026

## Abstract

Large language model agents are moving from question answering toward action-taking workflows in enterprise environments. They can retrieve documents, reason over context, and call tools, but enterprise work often depends on company-specific operating rules: when a refund is allowed, when an invoice must be escalated, what discount can be offered, or which incident response procedure should be followed. Retrieval-augmented generation helps models access relevant information, but retrieved context is not the same as an approved instruction. This paper introduces human-approved operational memory: a source-backed, auditable, machine-readable layer of approved workflows that agents can consult before acting. We describe Company Brain, a working prototype that ingests company sources from Gmail, Google Drive, Slack, and Notion; extracts repeatable workflows with an LLM; deduplicates similar skills; routes them through human approval; and exports an agent-readable skills file. The current system is not a solved enterprise governance platform and does not yet implement a runtime permit/deny policy engine. Instead, it demonstrates a practical intermediate layer between unstructured enterprise knowledge and safe agent execution. We present the architecture, data schema, examples, evaluation plan, security considerations, and limitations of the approach.

## 1. Introduction

Enterprise AI agents are increasingly expected to do more than answer questions. A deployed agent may be asked to triage support tickets, draft replies, update a CRM, approve routine invoices, issue refunds, propose discounts, or respond to incidents. These tasks are not only knowledge-intensive; they are rule-intensive. The agent must know not just what documents exist, but what the organization has actually approved it to do.

Today, that operational knowledge is usually scattered across Slack messages, email threads, support playbooks, Google Docs, Notion pages, spreadsheets, and informal decisions made by managers. Retrieval systems can surface relevant materials, but they do not by themselves establish whether a particular action is current, approved, safe, or within the agent's authority. An agent that retrieves an old policy may still take the wrong action. An agent that finds five related documents may still be unable to decide which workflow is authoritative. An agent that correctly summarizes a policy may still be unauthorized to execute it.

This paper argues that enterprise agents need an intermediate representation between raw company knowledge and autonomous action: human-approved operational memory. Operational memory is a set of source-backed, reviewed, machine-readable workflows that specify when an agent should use a skill, what steps it should follow, whether human approval is required, and which source evidence supports the workflow.

Company Brain is a prototype implementation of this idea. The prototype connects to company work applications, scans for repeatable operational workflows, extracts candidate skills, merges duplicates, lets a human approve them, and exports a JSON skills file for agents. The first target workflows are support and operations tasks such as refund handling, pricing exceptions, vendor invoice approval, order cancellation, and production incident response.

The contributions of this technical report are:

1. A problem framing: retrieval is insufficient for enterprise agents that take company-specific actions.
2. A definition of human-approved operational memory as a source-backed, auditable, agent-readable layer.
3. A prototype architecture for converting scattered company sources into approved agent skills.
4. A concrete skills-file schema and example outputs.
5. An evaluation plan for measuring extraction quality, approval burden, traceability, and agent compliance.
6. A candid discussion of limitations and the path from static skills files to a runtime policy API.

## 2. Related Work

### 2.1 Retrieval-Augmented Generation

Retrieval-Augmented Generation (RAG) combines a parametric language model with an external non-parametric memory accessed through retrieval. Lewis et al. introduced RAG for knowledge-intensive NLP tasks and noted that provenance and updating world knowledge remain important challenges for knowledge-intensive generation [1]. RAG is useful when models need access to external facts, documents, or updated information. However, RAG primarily answers the question "what information is relevant?" It does not inherently answer "which workflow has been approved?" or "is the agent permitted to act on this information?"

Company Brain builds on the value of retrieval but treats retrieval as only the first step. The system converts retrieved or ingested source material into reviewed operational instructions.

### 2.2 Tool-Using and Acting Agents

Recent work on language-model agents explores how models can reason, act, and call external tools. ReAct interleaves reasoning traces with task-specific actions, allowing models to interact with external sources and environments [2]. Toolformer shows that language models can learn to call external APIs and incorporate results into their predictions [3]. MRKL systems propose modular architectures that combine language models with external knowledge and discrete reasoning modules [4].

These systems motivate a future in which agents routinely call tools. Company Brain focuses on a complementary problem: before an enterprise agent calls a tool that changes company state, it should know the organization's approved operating rule for that action.

### 2.3 Documentation, Governance, and Human Oversight

AI risk and governance frameworks emphasize documentation, traceability, risk management, and human accountability. NIST's AI Risk Management Framework describes practices for managing AI risks across the lifecycle [5]. Work on model cards and datasheets argues for structured documentation of models and datasets to improve transparency and accountability [6, 7]. Human-AI interaction guidelines emphasize making system behavior understandable, supporting appropriate trust, and enabling corrective human control [8].

Company Brain applies similar documentation and approval principles to operational workflows rather than only models or datasets. The proposed artifact is not a model card; it is a machine-readable operating manual for agents, with source evidence and human approval metadata.

## 3. Problem Setting

### 3.1 Enterprise Action Tasks

We define an enterprise action task as a task in which an AI agent may take or recommend an action that changes company state, customer outcomes, financial records, operational logs, or external communications. Examples include:

- approving or denying a customer refund;
- applying a pricing exception;
- approving a vendor invoice;
- canceling an order;
- escalating an incident;
- sending an official customer response;
- updating a CRM record.

These actions are governed by company-specific rules that are often informal, scattered, and evolving.

### 3.2 Why Retrieval Alone Is Insufficient

For action-taking agents, retrieval can fail in several ways:

- Authority ambiguity: the retrieved document may not be the approved policy.
- Recency ambiguity: the retrieved policy may be outdated.
- Conflict ambiguity: multiple sources may disagree.
- Execution ambiguity: the document may describe the policy but not a step-by-step workflow.
- Permission ambiguity: the agent may know the rule but still need human approval before acting.
- Evidence ambiguity: the system may not preserve source links for audit or review.

The core problem is not just missing context. It is missing operational authority.

### 3.3 Human-Approved Operational Memory

We define human-approved operational memory as a set of structured workflow records with five properties:

1. Source-backed: each workflow links to the underlying documents, messages, or files that support it.
2. Human-approved: a responsible user verifies the workflow before agents use it without escalation.
3. Agent-readable: the workflow is represented in a format that an agent can parse and follow.
4. Auditable: the system records sources, contributors, approval status, and generated output.
5. Updateable: workflows can be revised as source policies change.

An operational skill record can be modeled as:

```
skill = {
  name,
  when_to_use,
  steps[],
  safety: {
    human_approved,
    use_without_approval
  },
  evidence: {
    contributors[],
    source_links[]
  }
}
```

This representation is intentionally simple. It is not a full policy language. It is a practical bridge between unstructured company knowledge and agent execution.

## 4. System Architecture

Company Brain is organized as a seven-stage pipeline:

1. Identity and connection: an admin adds an employee profile and connects work apps through OAuth.
2. Source ingestion: the system reads relevant Gmail, Drive, Slack, and Notion content.
3. Workflow candidate filtering: sources are filtered for likely operational workflows.
4. Skill extraction: an LLM converts relevant source text into structured skills.
5. Deduplication and merge: similar skills are detected and merged into cleaner canonical workflows.
6. Human review: a user reviews and approves skills.
7. Agent export: approved skills are exported as an agent-readable JSON file.

The current prototype uses a dashboard flow:

```
Connect work apps -> Scan sources -> Extract workflows -> Combine duplicates -> Review playbook -> Export skills file
```

The output is a static skills file. The next planned system component is a runtime policy API where agents can ask whether to proceed, escalate, or stop before taking an action.

## 5. Prototype Implementation

The prototype is implemented as a web application with the following stack:

- Frontend: Next.js, React, TypeScript, deployed on Vercel.
- Backend/API: Next.js API routes and Node.js.
- Database: Supabase/Postgres.
- Integrations: Google OAuth, Slack OAuth, and Notion OAuth.
- Data sources: Gmail, Google Drive, Slack, and Notion.
- AI extraction: Groq using Llama 3.3 70B Versatile.
- Deduplication: cosine similarity over serialized skill text, with LLM-assisted merge for similar skills.
- Output: a source-backed JSON skills file for agents.

The system stores employee connection records, raw ingested sources, and extracted skills in Supabase tables. The skill extraction prompt asks the model to extract repeatable workflows, including a short snake_case skill name, a trigger, and chronological steps. The system rejects common non-operational sources such as newsletters, course material, ads, and unrelated documents. After extraction, it serializes skill names, triggers, and steps into comparison text and applies cosine similarity to detect duplicates. Similar skills can be merged with the LLM into a cleaner canonical workflow. Human approval is recorded as a boolean field on the skill record.

The agent skills endpoint returns a JSON object with the format identifier, organization ID, generation timestamp, usage instructions, and a list of skills. The endpoint can return only human-approved skills by default, or all skills for review/debugging.

## 6. Agent Skills File Schema

The current skills-file schema is designed to be easy for agents to consume:

```json
{
  "format": "company_brain_agent_skills_file",
  "org_id": "org_123",
  "approved_only": true,
  "generated_at": "2026-05-25T00:00:00.000Z",
  "usage": "AI agents should match a user/task situation to when_to_use, follow steps in order, and ask a human before using unapproved skills.",
  "skills": [
    {
      "skill": "process_refund_request",
      "when_to_use": "Customer asks for a refund",
      "steps": [
        "Find the customer order and confirm the product purchase date and payment status",
        "If the request is within 7 days and the product was not used heavily, approve the refund",
        "If the request is after 7 days, offer store credit instead of a cash refund",
        "If the refund amount is over 100 dollars, escalate to a support lead before responding",
        "Send the customer a clear decision with the reason and expected processing time",
        "Record the refund decision and source order link in the support log"
      ],
      "safety": {
        "human_approved": true,
        "use_without_approval": true
      },
      "evidence": {
        "contributors": ["employee_1"],
        "source_links": [
          {
            "title": "Drive File: refund-policy.csv",
            "url": "https://drive.google.com/..."
          }
        ]
      }
    }
  ]
}
```

This schema is deliberately less expressive than a formal policy language. Its purpose is to support early enterprise agents that need procedural guidance, source evidence, and approval metadata.

## 7. Illustrative Use Cases

### 7.1 Support Refunds

A support agent receives a refund request. A RAG system may retrieve a refund policy, a Slack exception, and a prior support response. Company Brain instead exposes a canonical approved skill with a trigger, steps, approval status, and source links. The agent can decide whether the request falls within the approved refund workflow and whether escalation is required.

### 7.2 Pricing Exceptions

A sales or revenue operations agent receives a request for a custom discount. The relevant rule may depend on contract size, percentage discount, and required manager approval. Company Brain can represent this as an approved workflow that distinguishes auto-approval, manager approval, and founder/finance escalation.

### 7.3 Vendor Invoice Approval

A finance operations agent receives a new vendor invoice. The approved workflow may require matching the invoice against a purchase order, checking vendor details, and escalating above a dollar threshold. Company Brain converts that workflow into agent-readable steps with source evidence.

### 7.4 Incident Response

An operations agent detects a production issue. The approved workflow may specify when to escalate to engineering, how often to update customers, and when to publish a post-incident report. This workflow is more valuable as a reviewed operational skill than as a collection of scattered incident notes.

## 8. Evaluation Plan

The current prototype demonstrates system feasibility but has not yet been evaluated with enterprise pilots. A credible evaluation should measure four layers: extraction, review, agent use, and organizational safety.

### 8.1 Extraction Quality

For a labeled corpus of company sources, measure:

- precision: percentage of extracted skills that represent real operational workflows;
- recall: percentage of known workflows that the system extracts;
- step correctness: percentage of generated steps judged correct by a domain reviewer;
- trigger correctness: whether the "when_to_use" field matches the true operational trigger;
- source traceability: percentage of skills with sufficient source links.

### 8.2 Human Review Burden

Measure how much human effort is required to approve or correct skills:

- time to review each skill;
- percentage of skills accepted without edits;
- percentage requiring minor edits;
- percentage rejected as non-workflows or unsafe;
- inter-reviewer agreement for approval decisions.

### 8.3 Duplicate Reduction and Canonicalization

Measure whether deduplication improves usability:

- duplicate reduction rate;
- merge correctness;
- preservation of important exceptions;
- reviewer preference between raw and merged skill lists.

### 8.4 Agent Compliance

In simulated support, ops, or finance tasks, compare agents with and without Company Brain:

- rate of policy-compliant decisions;
- rate of unauthorized actions;
- rate of correct escalation;
- rate of answerable tasks completed without human intervention;
- quality of audit trail after task completion.

The most important future evaluation is not whether Company Brain produces impressive text. It is whether agents using approved operational memory make fewer unauthorized or policy-inconsistent decisions.

## 9. Security, Privacy, and Governance Considerations

Company Brain touches sensitive enterprise sources, so the architecture must be designed around least privilege, visibility control, and auditability.

Important requirements include:

- OAuth scope minimization: request only the permissions needed for ingestion.
- Source access control: avoid exposing raw private messages to broad admin users.
- Token security: encrypt and restrict access to OAuth tokens.
- Source provenance: preserve links to the documents or messages that support each skill.
- Human approval: prevent unapproved skills from being used without escalation.
- Versioning: record changes to approved skills over time.
- Revocation: allow skills to be disabled when policies change.
- Audit logs: record when skills are generated, approved, exported, and used.

The current prototype demonstrates the workflow but requires additional security hardening before real enterprise deployment.

## 10. Limitations

This report makes a systems argument and describes an early prototype. It does not claim that Company Brain has solved enterprise agent safety.

Key limitations include:

- No production enterprise pilots yet.
- Extraction quality can vary with source quality and model behavior.
- The current output is a static skills file, not a full runtime policy engine.
- Deduplication uses simple cosine similarity and may miss semantically similar workflows.
- The system can generate noisy fallback skills when source text is poorly structured.
- Human approval is required, and reviewer burden may become significant at scale.
- OAuth and source-permission models are complex in real organizations.
- The prototype does not yet implement robust policy versioning, revocation, or per-agent authorization.
- The current schema is procedural, not a formal policy language with guarantees.

These limitations are not incidental. They define the next research and engineering agenda.

## 11. From Skills Files to Runtime Policy APIs

The current Company Brain prototype exports approved skills files. This is useful for agents that need operating instructions, but a stronger version of the system would expose a runtime policy API. An agent would send a proposed task, relevant state, and intended action. Company Brain would return:

```
{
  "decision": "proceed | escalate | stop",
  "matched_skill": "process_refund_request",
  "required_steps": [...],
  "reason": "...",
  "source_links": [...],
  "human_approval_required": true
}
```

This would shift Company Brain from a static operational memory file to an enforcement layer. The policy API could support:

- action gating before tool calls;
- escalation decisions;
- audit logs for agent actions;
- organization-specific policy updates;
- per-agent or per-role permissions;
- continuous feedback from real agent outcomes.

The long-term direction is a company-specific policy and skills layer that sits between enterprise agents and the tools they use.

## 12. Discussion

The central claim of this paper is that enterprise agent safety is not only a model problem. It is also a representation problem. Companies need their operating rules represented in a way that agents can read, humans can approve, and auditors can trace.

RAG gives models access to knowledge. Tool-use frameworks let models act. Governance frameworks emphasize risk management and documentation. Human-approved operational memory connects these ideas in a practical system design: extract workflows from company sources, approve them, preserve evidence, and expose them to agents.

The earliest market wedge is likely not "all company knowledge." It is high-friction action workflows in support, operations, finance, compliance, and sales. These are areas where companies want automation but worry about agents taking the wrong action.

## 13. Conclusion

As AI agents move into enterprise workflows, the question changes from "Can the model answer?" to "Is the agent allowed to act?" Company Brain proposes human-approved operational memory as a missing layer for this transition. The prototype demonstrates an end-to-end path from scattered company sources to approved, source-backed, agent-readable skills files.

The system is early, and the strongest future work is empirical: evaluate whether approved operational memory reduces policy violations, improves escalation behavior, and makes agent actions more auditable. If enterprise agents are going to become reliable coworkers, they will need more than context. They will need approved operating instructions.

## References

[1] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Kuttler, M. Lewis, W. Yih, T. Rocktaschel, S. Riedel, and D. Kiela, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS, 2020. https://arxiv.org/abs/2005.11401

[2] S. Yao, J. Zhao, D. Yu, N. Du, I. Shafran, K. Narasimhan, and Y. Cao, "ReAct: Synergizing Reasoning and Acting in Language Models," ICLR, 2023. https://arxiv.org/abs/2210.03629

[3] T. Schick, J. Dwivedi-Yu, R. Dessi, R. Raileanu, M. Lomeli, L. Zettlemoyer, N. Cancedda, and T. Scialom, "Toolformer: Language Models Can Teach Themselves to Use Tools," 2023. https://arxiv.org/abs/2302.04761

[4] E. Karpas, O. Abend, Y. Belinkov, B. Lenz, O. Lieber, N. Ratner, Y. Shoham, H. Bata, Y. Levine, K. Leyton-Brown, D. Muhlgay, N. Rozen, E. Schwartz, G. Shachaf, S. Shalev-Shwartz, A. Shashua, and M. Tenenholtz, "MRKL Systems: A modular, neuro-symbolic architecture that combines large language models, external knowledge sources and discrete reasoning," 2022. https://arxiv.org/abs/2205.00445

[5] National Institute of Standards and Technology, "Artificial Intelligence Risk Management Framework (AI RMF 1.0)," NIST AI 100-1, 2023. https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10

[6] M. Mitchell, S. Wu, A. Zaldivar, P. Barnes, L. Vasserman, B. Hutchinson, E. Spitzer, I. D. Raji, and T. Gebru, "Model Cards for Model Reporting," FAT*, 2019. https://arxiv.org/abs/1810.03993

[7] T. Gebru, J. Morgenstern, B. Vecchione, J. W. Vaughan, H. Wallach, H. Daume III, and K. Crawford, "Datasheets for Datasets," Communications of the ACM, 2021. https://doi.org/10.1145/3458723

[8] S. Amershi, D. Weld, M. Vorvoreanu, A. Fourney, B. Nushi, P. Collisson, J. Suh, S. Iqbal, P. N. Bennett, K. Inkpen, J. Teevan, R. Kikin-Gil, and E. Horvitz, "Guidelines for Human-AI Interaction," CHI, 2019. https://doi.org/10.1145/3290605.3300233
