<?php
declare(strict_types=1);

namespace OmekaTheme\Helper;

use Laminas\View\Helper\AbstractHelper;
use Omeka\Api\Representation\AbstractResourceEntityRepresentation;
use Omeka\Api\Representation\ValueRepresentation;
use Throwable;

/**
 * Which metadata the EU "AI generated" mark goes on (common/resource-values).
 *
 * Two ways a value is known to be a model's work:
 *
 * - its property: `bibo:shortDescription` everywhere, `dcterms:tableOfContents`
 *   on template 21 — whole properties only an AI pipeline writes (__invoke);
 * - its value annotation: an authority record's `dcterms:description` drafted
 *   by AI_authority_curation carries `iwac:descriptionModel`, pointing at the
 *   model's authority item, on both its `fr` and `en` literals, while a
 *   curator-written description on the next record carries none
 *   (marksValues). About a thousand public descriptions carried it, unmarked,
 *   when this was added (November 2026).
 */
final class AiGeneratedTerms extends AbstractHelper
{
    private const ALWAYS_GENERATED = ['bibo:shortDescription'];

    private const GENERATED_BY_TEMPLATE = [
        21 => ['dcterms:tableOfContents'],
    ];

    /** Value annotations that say the annotated value itself was written by a model. */
    public const AI_VALUE_ANNOTATIONS = ['iwac:descriptionModel'];

    /**
     * @param AbstractResourceEntityRepresentation|null $resource
     * @return list<string>
     */
    public function __invoke(?object $resource = null): array
    {
        $terms = self::ALWAYS_GENERATED;
        if (!$resource || !method_exists($resource, 'resourceTemplate')) {
            return $terms;
        }

        $template = $resource->resourceTemplate();
        $templateId = $template ? (int) $template->id() : null;
        if ($templateId !== null && isset(self::GENERATED_BY_TEMPLATE[$templateId])) {
            $terms = array_merge($terms, self::GENERATED_BY_TEMPLATE[$templateId]);
        }

        return $terms;
    }

    /**
     * Whether a property row is a model's work by its values: true when there
     * is at least one value and EVERY value shown carries an AI provenance
     * annotation. The mark sits on the row's label, so a row mixing a
     * curator's value with a drafted one gets none rather than a label that
     * would claim the curator's text too.
     *
     * @param iterable<ValueRepresentation|mixed> $values the values the row will print
     */
    public static function marksValues(iterable $values): bool
    {
        $seen = false;
        foreach ($values as $value) {
            if (!self::isAnnotatedAi($value)) {
                return false;
            }
            $seen = true;
        }
        return $seen;
    }

    /** @param ValueRepresentation|mixed $value */
    public static function isAnnotatedAi(mixed $value): bool
    {
        if (!is_object($value) || !method_exists($value, 'valueAnnotation')) {
            return false;
        }
        try {
            $annotation = $value->valueAnnotation();
            if (!is_object($annotation) || !method_exists($annotation, 'value')) {
                return false;
            }
            foreach (self::AI_VALUE_ANNOTATIONS as $term) {
                if ($annotation->value($term) !== null) {
                    return true;
                }
            }
        } catch (Throwable $error) {
            // A provenance lookup that fails leaves the value unmarked; it
            // never breaks the page.
        }
        return false;
    }
}
