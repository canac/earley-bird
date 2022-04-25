import { Rule } from "./state";

// This class represents an Earley grammar consisting of a collection of rules
export class Grammar {
  #rules: Rule[];
  #rootRule: string;

  // Create a new grammar with the provided rules
  // The first rule should be the root rule, or it can be overridden by
  // providing a different root rule name
  constructor(rules: Rule[], rootRule?: string) {
    if (rules.length === 0) {
      throw new Error("Grammar contains no rules");
    }

    this.#rules = rules;
    this.#rootRule = rootRule ?? this.#rules[0].name;
  }

  // Return the root rules
  getRootRules(): Rule[] {
    return this.getRulesByName(this.#rootRule);
  }

  // Return the rules with a given name
  getRulesByName(name: string): Rule[] {
    return this.#rules.filter((rule) => rule.name === name);
  }

  // Determine whether the rule is a root rule
  isRootRule(rule: Rule): boolean {
    return rule.name === this.#rootRule;
  }
}
